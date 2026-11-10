import { HttpError, unauthorized } from '../http.mjs'
import { calculateAccess } from '../security/access.mjs'

const userColumns =
  'id, department_id, username, display_name, avatar, email, mobile, status, is_super_admin, last_login_at, created_at, updated_at, deleted_at'
export async function snapshot(db, actor, { userId = 0, roleId = 0 } = {}) {
  const result = await db.batch([
    db.prepare(`SELECT d.*, (SELECT count(*) FROM sys_user u WHERE u.department_id=d.id AND u.deleted_at IS NULL) AS user_count
      FROM sys_department d ORDER BY sort_order, id`),
    db.prepare(`SELECT r.*, (SELECT count(*) FROM sys_user_role ur JOIN sys_user u ON u.id=ur.user_id AND u.deleted_at IS NULL WHERE ur.role_id=r.id) AS user_count
      FROM sys_role r ORDER BY sort_order, id`),
    db.prepare('SELECT * FROM sys_menu ORDER BY sort_order, id'),
    db
      .prepare(
        `SELECT * FROM sys_role_menu WHERE role_id IN
      (SELECT role_id FROM sys_user_role WHERE user_id=?1) OR role_id=?2`
      )
      .bind(actor.id, roleId),
    db.prepare('SELECT * FROM sys_user_role WHERE user_id=?1 OR user_id=?2').bind(actor.id, userId),
    db.prepare(`SELECT ${userColumns} FROM sys_user WHERE id=?1 OR id=?2`).bind(actor.id, userId),
    db.prepare('SELECT revision FROM sys_data_revision WHERE id=1'),
    db
      .prepare('SELECT 1 AS valid FROM sys_auth_session WHERE token_hash=?1 AND expires_at>?2')
      .bind(actor.sessionHash, Date.now())
  ])
  const [departments, roles, menus, roleMenus, userRoles, users] = result.map((r) => r.results)
  const user = users.find((row) => row.id === actor.id && row.status === 1 && !row.deleted_at)
  if (!user || !result[7].results.length) throw unauthorized()
  const roleIds = new Set(
    userRoles.filter((row) => row.user_id === user.id).map((row) => row.role_id)
  )
  const activeRoles = roles.filter(
    (role) => roleIds.has(role.id) && role.status === 1 && !role.deleted_at
  )
  const activeIds = new Set(activeRoles.map((role) => role.id))
  const access = calculateAccess(user, {
    roles: activeRoles,
    menus,
    links: roleMenus.filter((link) => activeIds.has(link.role_id))
  })
  return {
    departments,
    roles,
    menus,
    roleMenus,
    userRoles,
    users,
    user,
    access,
    revision: result[6].results[0].revision
  }
}
const tables = new Set(['sys_user', 'sys_department', 'sys_role', 'sys_menu'])
function trusted(table, fields) {
  if (!tables.has(table) || Object.keys(fields).some((key) => !/^[a-z_]+$/.test(key)))
    throw new Error('Untrusted SQL identifier')
}
export function insert(db, table, fields) {
  trusted(table, fields)
  const keys = Object.keys(fields)
  return db
    .prepare(
      `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `?${i + 1}`).join(',')}) RETURNING *`
    )
    .bind(...Object.values(fields))
}
export function update(db, table, id, fields) {
  trusted(table, fields)
  return db
    .prepare(
      `UPDATE ${table} SET ${Object.keys(fields)
        .map((key, i) => `${key}=?${i + 1}`)
        .join(',')}
    WHERE id=?${Object.keys(fields).length + 1} AND deleted_at IS NULL RETURNING *`
    )
    .bind(...Object.values(fields), id)
}
export async function commit(db, actor, state, statements) {
  try {
    const results = await db.batch([
      db
        .prepare(
          'UPDATE sys_mutation_gate SET expected_revision=?1, actor_token_hash=?2 WHERE id=1'
        )
        .bind(state.revision, actor.sessionHash),
      ...statements
    ])
    return results.slice(1)
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('NPORA_AUTH_EXPIRED')) throw unauthorized()
    if (message.includes('NPORA_STALE_WRITE'))
      throw new HttpError(409, '数据或权限已变化，请刷新后重试')
    if (/UNIQUE constraint failed/i.test(message))
      throw new HttpError(409, '用户名、邮箱、手机号、编码、路由名称或权限码已存在')
    if (/FOREIGN KEY constraint failed/i.test(message))
      throw new HttpError(409, '关联数据已变化，请刷新后重试')
    throw error
  }
}
export const nowFields = () => ({ updated_at: new Date().toISOString() })
export const selectUsers = userColumns
