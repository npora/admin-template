import { HttpError } from '../http.mjs'
import { digest } from './crypto.mjs'

const windowMs = 15 * 60_000
export const limitLogin = (request, db, username, now) =>
  limitAttempts(request, db, username, now, false)
export const limitPasswordReset = (request, db, username, now) =>
  limitAttempts(request, db, username, now, true)

async function limitAttempts(request, db, username, now, reset) {
  // Only trust Cloudflare's edge-provided client IP, never user-controlled forwarding headers.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const account = username.toLowerCase()
  const prefix = reset ? 'reset:' : ''
  const buckets = [
    [`${prefix}ip:${ip}`, 30],
    [`${prefix}account-ip:${account}:${ip}`, 5]
  ]
  if (reset) buckets.push([`${prefix}account:${account}`, 10])
  const keys = await Promise.all(buckets.map(([key]) => digest(key)))
  const rows = await db.batch([
    db.prepare('DELETE FROM sys_auth_attempt WHERE expires_at <= ?1').bind(now),
    ...keys.map((key) =>
      db
        .prepare(
          `INSERT INTO sys_auth_attempt(bucket, attempts, expires_at) VALUES (?1, 1, ?2)
      ON CONFLICT(bucket) DO UPDATE SET attempts = min(attempts + 1, 1000000)
      RETURNING attempts, expires_at`
        )
        .bind(key, now + windowMs)
    )
  ])
  const blocked = rows
    .slice(1)
    .map((row) => row.results[0])
    .filter((row, index) => row.attempts > buckets[index][1])
  if (blocked.length) {
    const seconds = Math.max(
      1,
      Math.ceil((Math.max(...blocked.map((row) => row.expires_at)) - now) / 1000)
    )
    throw new HttpError(429, '尝试次数过多，请稍后再试', 429, { 'Retry-After': String(seconds) })
  }
}
