import { authenticate } from './auth.mjs'
import { HttpError, readJson, success } from '../http.mjs'
import { digest, verifyPassword } from '../security/crypto.mjs'
import { limitLogin } from '../security/rate-limit.mjs'
import { resolveAuthConfig } from '../config/auth.mjs'
import { snapshot, commit } from '../repositories/management.mjs'
import {
  createTotpSecret,
  encryptTotp,
  decryptTotp,
  verifyTotp,
  totpKeyConfigured
} from '../security/totp.mjs'

export const findTotp = (db, userId) =>
  db.prepare('SELECT * FROM sys_user_totp WHERE user_id = ?1').bind(userId).first()
async function contextFor(actor, env, targetId) {
  if (targetId === undefined) return { actor, user: actor }
  if (actor.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可管理用户验证器')
  const state = await snapshot(env.DB, actor, { userId: targetId })
  if (state.user.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可管理用户验证器')
  const user = await env.DB.prepare('SELECT * FROM sys_user WHERE id = ?1 AND deleted_at IS NULL')
    .bind(targetId)
    .first()
  if (!user) throw new HttpError(404, '用户不存在')
  if (user.is_super_admin === 1 && user.id !== actor.id)
    throw new HttpError(403, '不能管理其他超级管理员的验证器')
  if (user.status !== 1) throw new HttpError(400, '用户已停用，不能修改验证器')
  return { actor, user, state }
}
async function writeBinding(env, context, statement, additional = []) {
  // 管理员操作复用事务修订号和会话守卫，防止异步密码校验后权限已变化。
  return context.state
    ? (await commit(env.DB, context.actor, context.state, [statement, ...additional]))[0]
    : statement.all()
}
export async function authenticatorStatus(request, env, targetId) {
  const context = await contextFor(await authenticate(request, env.DB), env, targetId)
  const row = await findTotp(env.DB, context.user.id)
  return success({
    available: resolveAuthConfig(env).authenticatorEnabled && totpKeyConfigured(env),
    enabled: row?.enabled === 1
  })
}
async function reauthenticate(request, env, targetId) {
  const actor = await authenticate(request, env.DB)
  if (targetId !== undefined && actor.is_super_admin !== 1)
    throw new HttpError(403, '仅超级管理员可管理用户验证器')
  await limitLogin(request, env.DB, `totp:${actor.id}`, Date.now())
  const input = await readJson(request)
  if (
    typeof input.password !== 'string' ||
    input.password.length > 128 ||
    !(await verifyPassword(input.password, actor.password_hash, env.AUTH_PEPPER))
  )
    throw new HttpError(400, '密码或动态验证码错误')
  return { ...(await contextFor(actor, env, targetId)), input }
}
export async function setupAuthenticator(request, env, targetId) {
  if (!resolveAuthConfig(env).authenticatorEnabled) throw new HttpError(404, '验证器功能未开启')
  if (!totpKeyConfigured(env)) throw new HttpError(503, '验证器功能尚未配置')
  const context = await reauthenticate(request, env, targetId)
  const { user } = context
  const immediate = targetId !== undefined
  const secret = createTotpSecret()
  const encrypted = await encryptTotp(secret, user.id, env)
  const result = await writeBinding(
    env,
    context,
    env.DB.prepare(
      `INSERT INTO sys_user_totp(user_id, secret_encrypted, credential_fingerprint, pending_expires_at, enabled)
    SELECT id, ?1, ?2, ?3, ?6 FROM sys_user WHERE id = ?4 AND password_hash = ?5 AND status = 1 AND deleted_at IS NULL
    ON CONFLICT(user_id) DO UPDATE SET secret_encrypted = excluded.secret_encrypted,
    credential_fingerprint = excluded.credential_fingerprint, pending_expires_at = excluded.pending_expires_at, enabled = excluded.enabled, last_used_step = -1
    WHERE sys_user_totp.enabled = 0 RETURNING user_id`
    ).bind(
      encrypted,
      await digest(user.password_hash),
      immediate ? null : Date.now() + 300000,
      user.id,
      user.password_hash,
      immediate ? 1 : 0
    ),
    immediate
      ? [
          env.DB.prepare(
            `DELETE FROM sys_auth_session WHERE user_id=?1 AND EXISTS
      (SELECT 1 FROM sys_user_totp WHERE user_id=?1 AND secret_encrypted=?2 AND enabled=1)`
          ).bind(user.id, encrypted)
        ]
      : []
  )
  if (result.results.length !== 1) throw new HttpError(409, '账号状态已变化或验证器已绑定，请刷新')
  const issuer = resolveAuthConfig(env).authenticatorIssuer
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
async function checkedBinding(request, env, enabled, targetId) {
  const context = await reauthenticate(request, env, targetId)
  const { user, input } = context
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
  return { ...context, row, step }
}
export async function enableAuthenticator(request, env, targetId) {
  if (!resolveAuthConfig(env).authenticatorEnabled) throw new HttpError(404, '验证器功能未开启')
  const context = await checkedBinding(request, env, 0, targetId)
  const { user, row, step } = context
  const result = await writeBinding(
    env,
    context,
    env.DB.prepare(
      `UPDATE sys_user_totp SET enabled = 1, pending_expires_at = NULL, last_used_step = ?1
    WHERE user_id = ?2 AND enabled = 0 AND secret_encrypted = ?3 AND pending_expires_at > ?4
    AND EXISTS(SELECT 1 FROM sys_user WHERE id = ?2 AND password_hash = ?5 AND status = 1 AND deleted_at IS NULL)
    RETURNING user_id`
    ).bind(step, user.id, row.secret_encrypted, Date.now(), user.password_hash)
  )
  if (result.results.length !== 1) throw new HttpError(409, '绑定状态已变化，请重新操作')
  return success(null)
}
export async function disableAuthenticator(request, env, targetId) {
  const context = await checkedBinding(request, env, 1, targetId)
  const { user, row, step } = context
  const result = await writeBinding(
    env,
    context,
    env.DB.prepare(
      `DELETE FROM sys_user_totp WHERE user_id = ?1 AND enabled = 1 AND secret_encrypted = ?2 AND last_used_step < ?3
    AND EXISTS(SELECT 1 FROM sys_user WHERE id = ?1 AND password_hash = ?4 AND status = 1 AND deleted_at IS NULL)
    RETURNING user_id`
    ).bind(user.id, row.secret_encrypted, step, user.password_hash)
  )
  if (result.results.length !== 1) throw new HttpError(409, '绑定状态已变化，请重新操作')
  return success(null)
}
