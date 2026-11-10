import { readJson, success } from '../http.mjs'
import { authenticate } from './auth.mjs'
import { requirePermission } from '../security/access.mjs'
import { hashPassword } from '../security/crypto.mjs'
import {
  snapshot,
  commit,
  insert,
  update,
  nowFields,
  selectUsers
} from '../repositories/management.mjs'
import {
  fieldsOnly,
  text,
  optional,
  email,
  status,
  ids,
  find,
  invalid,
  conflict,
  nullable,
  pagination,
  descendants
} from './validation.mjs'
import { userDto } from './dto.mjs'

const keys = ['departmentId', 'displayName', 'avatar', 'email', 'mobile', 'status', 'roleIds']
function validate(input, state, existing, creating) {
  fieldsOnly(input, creating ? [...keys, 'username', 'password'] : keys)
  if (
    !text(input.displayName, 100) ||
    !optional(input.avatar, 500) ||
    !optional(input.email, 255) ||
    !email(input.email) ||
    !optional(input.mobile, 32) ||
    !status(input.status)
  )
    invalid('请检查姓名、资料、邮箱和状态')
  if (input.avatar && !/^https?:\/\//i.test(input.avatar)) invalid('头像必须是 HTTP(S) 地址')
  if (input.departmentId !== null) {
    const department = find(state.departments, input.departmentId, '部门')
    if (department.status !== 1 && department.id !== existing?.department_id)
      invalid('不能选择已停用的部门')
  }
  for (const roleId of ids(input.roleIds, 128)) find(state.roles, roleId, '角色')
  const previous = state.userRoles
    .filter(
      (link) =>
        link.user_id === existing?.id &&
        state.roles.some((role) => role.id === link.role_id && !role.deleted_at)
    )
    .map((link) => link.role_id)
  if (
    previous.length !== input.roleIds.length ||
    input.roleIds.some((value) => !previous.includes(value))
  )
    requirePermission(state.access, 'system:user:assign-roles')
  if (existing?.is_super_admin === 1 && input.status !== 1) conflict('超级管理员必须保持启用')
}
const fields = (input) => ({
  department_id: input.departmentId,
  display_name: input.displayName.trim(),
  avatar: nullable(input.avatar),
  email: nullable(input.email),
  mobile: nullable(input.mobile),
  status: input.status
})
function roleStatements(db, userId, roleIds) {
  return [
    db.prepare('DELETE FROM sys_user_role WHERE user_id=?1').bind(userId),
    db
      .prepare('INSERT INTO sys_user_role(user_id, role_id) SELECT ?1, value FROM json_each(?2)')
      .bind(userId, JSON.stringify(roleIds))
  ]
}
export async function users(request, env, routeId) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor, { userId: routeId })
  const action = { GET: 'list', POST: 'create', PUT: 'update', DELETE: 'delete' }[request.method]
  requirePermission(state.access, `system:user:${action}`)
  if (request.method === 'GET') {
    const query = pagination(new URL(request.url))
    const departmentIds =
      query.departmentId === null ? null : [...descendants(state.departments, query.departmentId)]
    const filter = `deleted_at IS NULL
      AND (?1='' OR instr(lower(username||' '||display_name||' '||coalesce(email,'')||' '||coalesce(mobile,'')),lower(?1))>0)
      AND (?2 IS NULL OR status=?2)
      AND (?3 IS NULL OR EXISTS(SELECT 1 FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.deleted_at IS NULL WHERE ur.user_id=sys_user.id AND ur.role_id=?3))
      AND (?4 IS NULL OR department_id IN (SELECT value FROM json_each(?4)))`
    const params = [
      query.keyword,
      query.status,
      query.roleId,
      departmentIds === null ? null : JSON.stringify(departmentIds)
    ]
    const result = await env.DB.batch([
      env.DB.prepare(`SELECT count(*) AS total FROM sys_user WHERE ${filter}`).bind(...params),
      env.DB.prepare(
        `SELECT ${selectUsers} FROM sys_user WHERE ${filter} ORDER BY id DESC LIMIT ?5 OFFSET ?6`
      ).bind(...params, query.pageSize, (query.page - 1) * query.pageSize),
      // Hydrate associations only for this bounded page, not the entire user table.
      env.DB.prepare(
        `SELECT ur.* FROM sys_user_role ur WHERE ur.user_id IN
        (SELECT id FROM sys_user WHERE ${filter} ORDER BY id DESC LIMIT ?5 OFFSET ?6)`
      ).bind(...params, query.pageSize, (query.page - 1) * query.pageSize)
    ])
    return success({
      total: result[0].results[0].total,
      list: result[1].results.map((row) => userDto(row, { ...state, userRoles: result[2].results }))
    })
  }
  if (request.method === 'DELETE') {
    const user = find(state.users, routeId, '用户')
    if (user.is_super_admin === 1) conflict('超级管理员不能删除')
    await commit(env.DB, actor, state, [
      update(env.DB, 'sys_user', routeId, { deleted_at: new Date().toISOString(), ...nowFields() })
    ])
    return success(null)
  }
  const input = await readJson(request)
  if (request.method === 'POST') {
    if (
      typeof input.username !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(input.username) ||
      typeof input.password !== 'string' ||
      input.password.length < 12 ||
      input.password.length > 128
    )
      invalid('用户名须为字母开头的 3–64 位字母数字下划线，密码须为 12–128 位')
    validate(input, state, undefined, true)
    const passwordHash = await hashPassword(input.password, env.AUTH_PEPPER)
    // Refresh authorization and references after the asynchronous password derivation.
    const fresh = await snapshot(env.DB, actor)
    requirePermission(fresh.access, 'system:user:create')
    validate(input, fresh, undefined, true)
    const results = await commit(env.DB, actor, fresh, [
      insert(env.DB, 'sys_user', {
        username: input.username,
        password_hash: passwordHash,
        ...fields(input)
      }),
      env.DB.prepare(
        `INSERT INTO sys_user_role(user_id, role_id)
        SELECT u.id, j.value FROM sys_user u, json_each(?1) j WHERE u.username=?2 COLLATE NOCASE`
      ).bind(JSON.stringify(input.roleIds), input.username)
    ])
    const row = results[0].results[0]
    return success(
      userDto(row, {
        ...fresh,
        userRoles: input.roleIds.map((role_id) => ({ user_id: row.id, role_id }))
      })
    )
  }
  const existing = find(state.users, routeId, '用户')
  validate(input, state, existing, false)
  const results = await commit(env.DB, actor, state, [
    update(env.DB, 'sys_user', routeId, { ...fields(input), ...nowFields() }),
    ...roleStatements(env.DB, routeId, input.roleIds)
  ])
  return success(
    userDto(results[0].results[0], {
      ...state,
      userRoles: input.roleIds.map((role_id) => ({ user_id: routeId, role_id }))
    })
  )
}
