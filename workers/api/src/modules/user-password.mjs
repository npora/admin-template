import { authenticate } from './auth.mjs'
import { HttpError, readJson, success } from '../http.mjs'
import { verifyPassword, hashPassword } from '../security/crypto.mjs'
import { limitLogin } from '../security/rate-limit.mjs'
import { snapshot, commit, update, nowFields } from '../repositories/management.mjs'

export async function resetUserPassword(request, env, userId) {
  const actor = await authenticate(request, env.DB)
  if (actor.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可重置密码')
  await limitLogin(request, env.DB, `password-reset:${actor.id}`, Date.now())
  const input = await readJson(request)
  if (
    typeof input.currentPassword !== 'string' ||
    input.currentPassword.length > 128 ||
    typeof input.newPassword !== 'string' ||
    input.newPassword.length < 12 ||
    input.newPassword.length > 128
  )
    throw new HttpError(400, '新密码需包含 12–128 个字符')
  if (!(await verifyPassword(input.currentPassword, actor.password_hash, env.AUTH_PEPPER)))
    throw new HttpError(400, '管理员密码错误')
  const passwordHash = await hashPassword(input.newPassword, env.AUTH_PEPPER)
  const state = await snapshot(env.DB, actor, { userId })
  if (state.user.is_super_admin !== 1) throw new HttpError(403, '仅超级管理员可重置密码')
  const target = state.users.find((row) => row.id === userId && row.deleted_at == null)
  if (!target) throw new HttpError(404, '用户不存在')
  if (target.is_super_admin === 1 && actor.id !== userId)
    throw new HttpError(403, '不能重置其他超级管理员的密码')
  await commit(env.DB, actor, state, [
    update(env.DB, 'sys_user', userId, { password_hash: passwordHash, ...nowFields() })
  ])
  return success(null)
}
