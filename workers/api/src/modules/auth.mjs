import { HttpError, unauthorized, readJson, success } from '../http.mjs'
import { digest, randomHex, verifyPassword, passwordIterations } from '../security/crypto.mjs'
import { limitLogin } from '../security/rate-limit.mjs'
import { authorization, userInfo, dynamicRoutes } from '../security/access.mjs'
import {
  findLoginUser,
  findSession,
  saveSession,
  deleteSession,
  findEnabledTotp
} from '../repositories/auth.mjs'
import { decryptTotp, verifyTotp } from '../security/totp.mjs'
import { resolveAuthConfig } from '../config/auth.mjs'

function bearer(request) {
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get('Authorization') || '')
  if (!match) throw unauthorized()
  return match[1]
}
export async function authenticate(request, db) {
  const tokenHash = await digest(bearer(request))
  const user = await findSession(db, tokenHash, Date.now())
  if (!user) throw unauthorized()
  if ((await digest(user.password_hash)) !== user.credential_fingerprint) {
    await deleteSession(db, tokenHash)
    throw unauthorized()
  }
  return { ...user, sessionHash: tokenHash }
}
export async function login(request, env) {
  const input = await readJson(request)
  if (
    typeof input.username !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(input.username) ||
    typeof input.password !== 'string' ||
    input.password.length < 1 ||
    input.password.length > 128 ||
    (input.rememberMe !== undefined && typeof input.rememberMe !== 'boolean')
  )
    throw new HttpError(400, '用户名或密码格式错误')
  await limitLogin(request, env.DB, input.username, Date.now())
  const user = await findLoginUser(env.DB, input.username)
  const valid = await verifyPassword(
    input.password,
    user?.password_hash,
    env.AUTH_PEPPER,
    passwordIterations(env)
  )
  if (!valid || !user || user.status !== 1) throw new HttpError(401, '用户名或密码错误', 10001)
  const binding = await findEnabledTotp(env.DB, user.id)
  // 开关仅控制新绑定；已绑定账号始终验证动态码，不能通过关闭入口绕过。
  if (binding) {
    const step = await verifyTotp(
      await decryptTotp(binding.secret_encrypted, user.id, env),
      input.totpCode,
      Date.now(),
      binding.last_used_step
    )
    if (step === null)
      throw new HttpError(400, '请输入有效的验证器动态码，验证码不能重复使用', 10003)
    const consumed = await env.DB.prepare(
      'UPDATE sys_user_totp SET last_used_step = ?1 WHERE user_id = ?2 AND enabled = 1 AND secret_encrypted = ?3 AND last_used_step < ?1 RETURNING user_id'
    )
      .bind(step, user.id, binding.secret_encrypted)
      .all()
    if (consumed.results.length !== 1)
      throw new HttpError(400, '动态验证码已使用，请等待下一个验证码', 10003)
  }
  const config = resolveAuthConfig(env)
  const ttl = input.rememberMe === true ? config.rememberedSessionTtlMs : config.sessionTtlMs
  const accessToken = randomHex()
  const saved = await saveSession(
    env.DB,
    user,
    await digest(accessToken),
    await digest(user.password_hash),
    Date.now(),
    ttl,
    binding?.secret_encrypted ?? ''
  )
  if (!saved) throw new HttpError(401, '用户名或密码错误', 10001)
  return success({ accessToken, expiresAt: Date.now() + ttl })
}
export async function logout(request, env) {
  // Idempotent for expired/revoked tokens. Invalid syntax still returns 401.
  await deleteSession(env.DB, await digest(bearer(request)))
  return success(null)
}
export async function currentUser(request, env) {
  const user = await authenticate(request, env.DB)
  return success(userInfo(user, await authorization(env.DB, user)))
}
export async function routes(request, env) {
  const user = await authenticate(request, env.DB)
  return success(dynamicRoutes(await authorization(env.DB, user)))
}

export async function sessionInfo(request, env) {
  const user = await authenticate(request, env.DB)
  const access = await authorization(env.DB, user)
  return success({ user: userInfo(user, access), routes: dynamicRoutes(access) })
}
