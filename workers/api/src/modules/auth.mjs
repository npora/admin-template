import { HttpError, unauthorized, readJson, success } from '../http.mjs'
import { digest, randomHex, verifyPassword } from '../security/crypto.mjs'
import { limitLogin } from '../security/rate-limit.mjs'
import { authorization, userInfo, dynamicRoutes } from '../security/access.mjs'
import { findLoginUser, findSession, saveSession, deleteSession } from '../repositories/auth.mjs'

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
    input.password.length > 128
  )
    throw new HttpError(400, '用户名或密码格式错误')
  await limitLogin(request, env.DB, input.username, Date.now())
  const user = await findLoginUser(env.DB, input.username)
  const valid = await verifyPassword(input.password, user?.password_hash, env.AUTH_PEPPER)
  if (!valid || !user || user.status !== 1) throw new HttpError(401, '用户名或密码错误', 10001)
  const accessToken = randomHex()
  const saved = await saveSession(
    env.DB,
    user,
    await digest(accessToken),
    await digest(user.password_hash),
    Date.now(),
    60 * 60_000
  )
  if (!saved) throw new HttpError(401, '用户名或密码错误', 10001)
  return success({ accessToken })
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
