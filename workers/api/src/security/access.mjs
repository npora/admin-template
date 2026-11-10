import { HttpError } from '../http.mjs'
import { readAccess } from '../repositories/auth.mjs'

export async function authorization(db, user) {
  return calculateAccess(user, await readAccess(db, user.id))
}
export function calculateAccess(user, { roles, menus, links }) {
  const byId = new Map(menus.map((menu) => [menu.id, menu]))
  const active = (menu) => {
    const seen = new Set()
    let current = menu
    while (current) {
      if (seen.has(current.id) || current.deleted_at || current.status !== 1) return false
      seen.add(current.id)
      if (current.parent_id === null) return true
      current = byId.get(current.parent_id)
    }
    return false
  }
  const grants = new Set(
    user.is_super_admin === 1
      ? menus.filter(active).map((menu) => menu.id)
      : links.map((link) => link.menu_id).filter((id) => active(byId.get(id)))
  )
  // Only button nodes yield permission codes. A role named admin never implies '*'.
  const permissions =
    user.is_super_admin === 1
      ? ['*']
      : [
          ...new Set(
            menus
              .filter(
                (menu) =>
                  grants.has(menu.id) &&
                  menu.type === 3 &&
                  /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/.test(menu.permission)
              )
              .map((menu) => menu.permission)
          )
        ]
  return { roles: roles.map((role) => role.code), permissions, grants, menus, byId, active }
}
export function userInfo(user, access) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    ...(user.avatar ? { avatar: user.avatar } : {}),
    departmentId: user.department_id,
    isSuperAdmin: user.is_super_admin === 1,
    roles: access.roles,
    permissions: access.permissions
  }
}
export function requirePermission(access, permission) {
  if (!access.permissions.includes('*') && !access.permissions.includes(permission))
    throw new HttpError(403, '没有执行此操作的权限')
}
function routeQuery(value) {
  if (!value) return undefined
  const data = JSON.parse(value)
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    Object.entries(data).some(
      ([key, item]) =>
        ['__proto__', 'constructor', 'prototype'].includes(key) ||
        !['string', 'number', 'boolean'].includes(typeof item)
    )
  )
    throw new Error('Invalid route query in database')
  return data
}
export function dynamicRoutes(access) {
  const ids = new Set(access.grants)
  // Restore ancestors of a granted node, but never grant its siblings/descendants.
  for (const id of access.grants) {
    let node = access.byId.get(id)
    while (node?.parent_id !== null && node?.parent_id !== undefined) {
      ids.add(node.parent_id)
      node = access.byId.get(node.parent_id)
    }
  }
  const build = (parentId) =>
    access.menus
      .filter(
        (menu) =>
          menu.parent_id === parentId && menu.type !== 3 && ids.has(menu.id) && access.active(menu)
      )
      .flatMap((menu) => {
        const children = build(menu.id)
        if (menu.type === 1 && !children.length) return []
        return [
          {
            path: menu.path,
            name: menu.name ?? undefined,
            title: menu.title,
            component: menu.component ?? undefined,
            redirect: menu.redirect ?? undefined,
            icon: menu.icon ?? undefined,
            routeQuery: routeQuery(menu.route_query),
            activeMenu: menu.active_menu ?? undefined,
            hidden: menu.visible !== 1,
            alwaysShow: menu.always_show === 1,
            keepAlive: menu.keep_alive === 1,
            fixedTab: menu.fixed_tab === 1,
            order: menu.sort_order,
            ...(children.length ? { children } : {}),
            permissions: access.menus
              .filter(
                (node) =>
                  node.parent_id === menu.id && node.type === 3 && access.grants.has(node.id)
              )
              .map((node) => ({ name: node.title, permission: node.permission }))
          }
        ]
      })
  return build(null)
}
