export const audit = (row) => ({ createdAt: row.created_at, updatedAt: row.updated_at })
export const roleOption = (row) => ({
  id: row.id,
  name: row.name,
  code: row.code,
  status: row.status
})
export const roleDto = (row) => ({
  ...roleOption(row),
  description: row.description,
  sortOrder: row.sort_order,
  userCount: row.user_count ?? 0,
  ...audit(row)
})
export const departmentDto = (row) => ({
  id: row.id,
  parentId: row.parent_id,
  name: row.name,
  code: row.code,
  leader: row.leader,
  phone: row.phone,
  email: row.email,
  sortOrder: row.sort_order,
  status: row.status,
  userCount: row.user_count ?? 0,
  ...audit(row)
})
export const menuDto = (row) => ({
  id: row.id,
  parentId: row.parent_id,
  type: row.type,
  title: row.title,
  name: row.name,
  path: row.path,
  component: row.component,
  redirect: row.redirect,
  routeQuery: row.route_query ? JSON.parse(row.route_query) : null,
  activeMenu: row.active_menu,
  icon: row.icon,
  permission: row.permission,
  visible: row.visible === 1,
  alwaysShow: row.always_show === 1,
  keepAlive: row.keep_alive === 1,
  fixedTab: row.fixed_tab === 1,
  sortOrder: row.sort_order,
  status: row.status,
  ...audit(row)
})
export function userDto(row, state) {
  const links = state.userRoles.filter((link) => link.user_id === row.id)
  const roleIds = new Set(links.map((link) => link.role_id))
  const roles = state.roles
    .filter((role) => roleIds.has(role.id) && !role.deleted_at)
    .map(roleOption)
  return {
    id: row.id,
    username: row.username,
    departmentId: row.department_id,
    departmentName:
      state.departments.find((dept) => dept.id === row.department_id && !dept.deleted_at)?.name ??
      null,
    displayName: row.display_name,
    avatar: row.avatar,
    email: row.email,
    mobile: row.mobile,
    status: row.status,
    isSuperAdmin: row.is_super_admin === 1,
    lastLoginAt: row.last_login_at,
    roles,
    roleIds: roles.map((role) => role.id),
    ...audit(row)
  }
}
export function tree(rows, mapper) {
  const children = new Map()
  for (const row of rows.filter((row) => !row.deleted_at)) {
    const list = children.get(row.parent_id) || []
    list.push(row)
    children.set(row.parent_id, list)
  }
  const visit = (parent, ancestors = new Set()) =>
    (children.get(parent) || []).flatMap((row) => {
      if (ancestors.has(row.id)) return []
      const next = new Set(ancestors).add(row.id)
      const nested = visit(row.id, next)
      return [{ ...mapper(row), ...(nested.length ? { children: nested } : {}) }]
    })
  return visit(null)
}
