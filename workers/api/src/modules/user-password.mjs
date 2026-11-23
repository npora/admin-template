import { auditOperation } from './audit-logs.mjs'
import { authenticate } from './auth.mjs'
import { HttpError, readJson, success, unauthorized } from '../http.mjs'
import { verifyPassword, hashPassword, passwordIterations } from '../security/crypto.mjs'
import { limitLogin, limitPasswordReset } from '../security/rate-limit.mjs'
import {
  findLoginUser,
  findEnabledTotp,
  findSession,
  updatePassword
} from '../repositories/auth.mjs'
import { decryptTotp, totpKeyConfigured, verifyTotp } from '../security/totp.mjs'
import { isProtectedDemoAccount } from '../config/auth.mjs'
import { assertCredentialsWritable } from '../security/access.mjs'
import { snapshot, commit, update, nowFields } from '../repositories/management.mjs'

const NEW_PASSWORD_MIN_LENGTH = 6

export async function resetUserPassword(request, env, userId) {
  const actor = await authenticate(request, env.DB)
  return auditOperation(env.DB, actor.id, userId, 'password_reset', (auditSuccess) =>
    applyPasswordReset(request, env, userId, actor, auditSuccess)
  )
}

async function applyPasswordReset(request, env, userId, actor, auditSuccess) {
  if (actor.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可重置密码')
  await limitLogin(request, env.DB, `password-reset:${actor.id}`, Date.now())
  const input = await readJson(request)
  if (
    typeof input.currentPassword !== 'string' ||
    input.currentPassword.length > 128 ||
    !validNewPassword(input.newPassword)
  )
    throw new HttpError(400, `新密码需包含 ${NEW_PASSWORD_MIN_LENGTH}–128 个字符`)
  if (
    !(await verifyPassword(
      input.currentPassword,
      actor.password_hash,
      env.AUTH_PEPPER,
      passwordIterations(env)
    ))
  )
    throw new HttpError(400, '管理员密码错误')
  const passwordHash = await hashPassword(
    input.newPassword,
    env.AUTH_PEPPER,
    passwordIterations(env),
    { minimumLength: NEW_PASSWORD_MIN_LENGTH }
  )
  const state = await snapshot(env.DB, actor, { userId })
  if (state.user.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可重置密码')
  const target = state.users.find((row) => row.id === userId && row.deleted_at == null)
  if (!target) throw new HttpError(404, '用户不存在')
  assertCredentialsWritable(target, env)
  if (target.is_super_admin === 1 && actor.id !== userId)
    throw new HttpError(403, '不能重置其他超级管理员的密码')
  const [result] = await commit(env.DB, actor, state, [
    update(env.DB, 'sys_user', userId, { password_hash: passwordHash, ...nowFields() }),
    auditSuccess(true)
  ])
  if (result.results.length !== 1) throw new HttpError(409, '账号状态已变化，请刷新')
  return success(null)
}

export async function resetOwnPassword(request, env) {
  const { username, totpCode, newPassword } = await readJson(request)
  if (
    typeof username !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(username) ||
    typeof totpCode !== 'string' ||
    !/^\d{6}$/.test(totpCode) ||
    !validNewPassword(newPassword)
  )
    throw new HttpError(400, '账号、动态验证码或新密码格式错误')
  await limitPasswordReset(request, env.DB, username, Date.now())
  if (!totpKeyConfigured(env)) throw new HttpError(503, '验证器功能尚未配置')

  const user = await findLoginUser(env.DB, username)
  const binding = await findEnabledTotp(env.DB, user?.id ?? 0)
  const secret = binding
    ? await decryptTotp(binding.secret_encrypted, user.id, env)
    : 'A'.repeat(32)
  const step = await verifyTotp(secret, totpCode, Date.now(), binding?.last_used_step)
  const invalid = () => new HttpError(400, '账号或验证器动态码无效，请使用新的动态码重试')
  if (!user || user.status !== 1 || !binding || step === null || isProtectedDemoAccount(user, env))
    throw invalid()

  const passwordHash = await hashPassword(newPassword, env.AUTH_PEPPER, passwordIterations(env), {
    minimumLength: NEW_PASSWORD_MIN_LENGTH
  })
  if (!(await updatePassword(env.DB, user, binding, step, passwordHash, Date.now())))
    throw invalid()
  return success(null)
}

function validNewPassword(value) {
  return typeof value === 'string' && value.length >= NEW_PASSWORD_MIN_LENGTH && value.length <= 128
}

export async function changeOwnPassword(request, env) {
  const user = await authenticate(request, env.DB)
  assertCredentialsWritable(user, env)
  const { currentPassword, newPassword, totpCode } = await readJson(request)
  if (
    typeof currentPassword !== 'string' ||
    currentPassword.length < 1 ||
    currentPassword.length > 128 ||
    !validNewPassword(newPassword)
  )
    throw new HttpError(400, `请输入当前密码，新密码需包含 ${NEW_PASSWORD_MIN_LENGTH}–128 个字符`)
  await limitLogin(request, env.DB, `password-change:${user.id}`, Date.now())
  if (
    !(await verifyPassword(
      currentPassword,
      user.password_hash,
      env.AUTH_PEPPER,
      passwordIterations(env)
    ))
  )
    throw new HttpError(400, '当前密码错误')
  const binding = await findEnabledTotp(env.DB, user.id)
  const step = binding
    ? await verifyTotp(
        await decryptTotp(binding.secret_encrypted, user.id, env),
        totpCode,
        Date.now(),
        binding.last_used_step
      )
    : -1
  if (step === null) throw new HttpError(400, '请输入有效的验证器动态码，验证码不能重复使用', 10003)
  const passwordHash = await hashPassword(newPassword, env.AUTH_PEPPER, passwordIterations(env), {
    minimumLength: NEW_PASSWORD_MIN_LENGTH
  })
  if (!(await updatePassword(env.DB, user, binding, step, passwordHash, Date.now()))) {
    if (!(await findSession(env.DB, user.sessionHash, Date.now()))) throw unauthorized()
    throw new HttpError(409, '账号或验证器状态已变化，请重新操作')
  }
  return success(null)
}
