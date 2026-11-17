import { authenticate } from './auth.mjs'
import { HttpError, readJson, success } from '../http.mjs'
import { digest, verifyPassword } from '../security/crypto.mjs'
import { limitLogin } from '../security/rate-limit.mjs'
import {
  createTotpSecret,
  encryptTotp,
  decryptTotp,
  verifyTotp,
  totpKeyConfigured
} from '../security/totp.mjs'

export const findTotp = (db, userId) =>
  db.prepare('SELECT * FROM sys_user_totp WHERE user_id = ?1').bind(userId).first()
export async function authenticatorStatus(request, env) {
  const user = await authenticate(request, env.DB)
  const row = await findTotp(env.DB, user.id)
  return success({
    available: env.AUTH_TOTP_ENABLED === 'true' && totpKeyConfigured(env),
    enabled: row?.enabled === 1
  })
}
async function reauthenticate(request, env) {
  const user = await authenticate(request, env.DB)
  await limitLogin(request, env.DB, `totp:${user.id}`, Date.now())
  const input = await readJson(request)
  if (
    typeof input.password !== 'string' ||
    input.password.length > 128 ||
    !(await verifyPassword(input.password, user.password_hash, env.AUTH_PEPPER))
  )
    throw new HttpError(400, '密码或动态验证码错误')
  return { user, input }
}
export async function setupAuthenticator(request, env) {
  if (env.AUTH_TOTP_ENABLED !== 'true') throw new HttpError(404, '验证器功能未开启')
  if (!totpKeyConfigured(env)) throw new HttpError(503, '验证器功能尚未配置')
  const { user } = await reauthenticate(request, env)
  const secret = createTotpSecret()
  const encrypted = await encryptTotp(secret, user.id, env)
  const result = await env.DB.prepare(
    `INSERT INTO sys_user_totp(user_id, secret_encrypted, credential_fingerprint, pending_expires_at)
    SELECT id, ?1, ?2, ?3 FROM sys_user WHERE id = ?4 AND password_hash = ?5 AND status = 1 AND deleted_at IS NULL
    ON CONFLICT(user_id) DO UPDATE SET secret_encrypted = excluded.secret_encrypted,
    credential_fingerprint = excluded.credential_fingerprint, pending_expires_at = excluded.pending_expires_at, last_used_step = -1
    WHERE sys_user_totp.enabled = 0`
  )
    .bind(
      encrypted,
      await digest(user.password_hash),
      Date.now() + 300000,
      user.id,
      user.password_hash
    )
    .run()
  if (result.meta.changes !== 1) throw new HttpError(409, '账号状态已变化或验证器已绑定，请刷新')
  const issuer = String(env.AUTH_TOTP_ISSUER || 'Npora Admin').slice(0, 80)
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  })
  return success({
    secret,
    uri: `otpauth://totp/${encodeURIComponent(`${issuer}:${user.username}`)}?${query}`
  })
}
async function checkedBinding(request, env, enabled) {
  const { user, input } = await reauthenticate(request, env)
  const row = await findTotp(env.DB, user.id)
  if (
    !row ||
    row.enabled !== enabled ||
    (!enabled &&
      (row.pending_expires_at <= Date.now() ||
        row.credential_fingerprint !== (await digest(user.password_hash))))
  )
    throw new HttpError(400, '绑定状态已变化或设置已过期，请重新操作')
  const step = await verifyTotp(
    await decryptTotp(row.secret_encrypted, user.id, env),
    input.code,
    Date.now(),
    row.last_used_step
  )
  if (step === null) throw new HttpError(400, '密码或动态验证码错误，验证码不能重复使用')
  return { user, row, step }
}
export async function enableAuthenticator(request, env) {
  if (env.AUTH_TOTP_ENABLED !== 'true') throw new HttpError(404, '验证器功能未开启')
  const { user, row, step } = await checkedBinding(request, env, 0)
  const result = await env.DB.prepare(
    `UPDATE sys_user_totp SET enabled = 1, pending_expires_at = NULL, last_used_step = ?1
    WHERE user_id = ?2 AND enabled = 0 AND secret_encrypted = ?3 AND pending_expires_at > ?4
    AND EXISTS(SELECT 1 FROM sys_user WHERE id = ?2 AND password_hash = ?5 AND status = 1 AND deleted_at IS NULL)`
  )
    .bind(step, user.id, row.secret_encrypted, Date.now(), user.password_hash)
    .run()
  if (result.meta.changes !== 1) throw new HttpError(409, '绑定状态已变化，请重新操作')
  return success(null)
}
export async function disableAuthenticator(request, env) {
  const { user, row, step } = await checkedBinding(request, env, 1)
  const result = await env.DB.prepare(
    `DELETE FROM sys_user_totp WHERE user_id = ?1 AND enabled = 1 AND secret_encrypted = ?2 AND last_used_step < ?3
    AND EXISTS(SELECT 1 FROM sys_user WHERE id = ?1 AND password_hash = ?4 AND status = 1 AND deleted_at IS NULL)`
  )
    .bind(user.id, row.secret_encrypted, step, user.password_hash)
    .run()
  if (result.meta.changes !== 1) throw new HttpError(409, '绑定状态已变化，请重新操作')
  return success(null)
}
