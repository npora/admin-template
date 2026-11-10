import { success } from '../http.mjs'
import { authenticate } from './auth.mjs'
import { snapshot, selectUsers } from '../repositories/management.mjs'
import { dynamicRoutes } from '../security/access.mjs'
import { userDto } from './dto.mjs'
export async function dashboard(request, env) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor)
  const can = (permission) =>
    state.access.permissions.includes('*') || state.access.permissions.includes(permission)
  const capabilities = {
    users: can('system:user:list'),
    roles: can('system:role:list'),
    departments: can('system:department:list'),
    menus: can('system:menu:list')
  }
  const countPages = (nodes) =>
    nodes.reduce(
      (count, node) => count + Number(Boolean(node.component)) + countPages(node.children || []),
      0
    )
  const roleIds = new Set(
    state.userRoles.filter((row) => row.user_id === actor.id).map((row) => row.role_id)
  )
  const result = {
    generatedAt: new Date().toISOString(),
    capabilities,
    account: {
      roleNames: state.roles
        .filter((role) => roleIds.has(role.id) && role.status === 1 && !role.deleted_at)
        .map((role) => role.name),
      departmentName:
        state.departments.find((row) => row.id === state.user.department_id && !row.deleted_at)
          ?.name ?? null,
      isSuperAdmin: state.user.is_super_admin === 1
    },
    accessiblePages: 3 + countPages(dynamicRoutes(state.access))
  }
  if (capabilities.users) {
    const data = await env.DB.batch([
      env.DB.prepare(
        'SELECT count(*) AS total, coalesce(sum(status=1),0) AS enabled, coalesce(sum(status=0),0) AS disabled FROM sys_user WHERE deleted_at IS NULL'
      ),
      env.DB.prepare(
        `SELECT ${selectUsers} FROM sys_user WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 5`
      ),
      env.DB.prepare(
        `SELECT ur.* FROM sys_user_role ur WHERE ur.user_id IN (SELECT id FROM sys_user WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 5)`
      ),
      env.DB.prepare(`SELECT d.id, coalesce(d.name,'未分配部门') AS name, count(*) AS count
        FROM sys_user u LEFT JOIN sys_department d ON u.department_id=d.id AND d.deleted_at IS NULL
        WHERE u.deleted_at IS NULL GROUP BY d.id, d.name ORDER BY count DESC, d.id`)
    ])
    result.users = {
      ...data[0].results[0],
      recent: data[1].results.map((row) => userDto(row, { ...state, userRoles: data[2].results })),
      departments: data[3].results
    }
  }
  for (const key of ['roles', 'departments'])
    if (capabilities[key]) {
      const rows = state[key].filter((row) => !row.deleted_at)
      result[key] = { total: rows.length, enabled: rows.filter((row) => row.status === 1).length }
    }
  return success(result)
}
