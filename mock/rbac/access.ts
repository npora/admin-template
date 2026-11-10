import type { DynamicRoute } from '@/api/types/route'
import type { UserInfoResult } from '@/api/types/auth'
import type { ManagedUser } from '@/api/types/user'
import type { ManagedRole } from '@/api/types/role'
import type { ManagedMenu } from '@/api/types/menu'
import type { DepartmentOption, ManagedDepartment } from '@/api/types/department'
import type { MenuRow, RoleRow, UserRow, DepartmentRow } from './types'
import { db } from './database'

export function userRoles(userId: number): RoleRow[] {
  const ids = new Set(
    db.userRoles.filter((row) => row.user_id === userId).map((row) => row.role_id)
  )
  return db.roles
    .filter((role) => ids.has(role.id) && !role.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order)
}
export function isActiveMenu(menu: MenuRow): boolean {
  const seen = new Set<number>()
  let current: MenuRow | undefined = menu
  while (current) {
    if (seen.has(current.id) || current.deleted_at || current.status !== 1) return false
    seen.add(current.id)
    if (current.parent_id === null) return true
    current = db.menus.find((item) => item.id === current!.parent_id)
    if (!current) return false
  }
  return false
}
export function grantedMenuIds(user: UserRow): Set<number> {
  if (user.is_super_admin) return new Set(db.menus.filter(isActiveMenu).map((menu) => menu.id))
  const roles = new Set(
    userRoles(user.id)
      .filter((role) => role.status === 1)
      .map((role) => role.id)
  )
  return new Set(
    db.roleMenus
      .filter((link) => roles.has(link.role_id))
      .map((link) => link.menu_id)
      .filter((id) => {
        const menu = db.menus.find((item) => item.id === id)
        return menu && isActiveMenu(menu)
      })
  )
}
export function getUserInfo(user: UserRow): UserInfoResult {
  const ids = grantedMenuIds(user)
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar ?? undefined,
    departmentId: user.department_id,
    isSuperAdmin: Boolean(user.is_super_admin),
    roles: userRoles(user.id)
      .filter((role) => role.status === 1)
      .map((role) => role.code),
    permissions: user.is_super_admin
      ? ['*']
      : [
          ...new Set(
            db.menus
              .filter((menu) => ids.has(menu.id) && menu.type === 3 && menu.permission)
              .map((menu) => menu.permission!)
          )
        ]
  }
}
export function toUserDto(user: UserRow): ManagedUser {
  const roles = userRoles(user.id).map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    status: role.status
  }))
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    departmentId: user.department_id,
    departmentName:
      db.departments.find((item) => item.id === user.department_id && !item.deleted_at)?.name ??
      null,
    avatar: user.avatar,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    isSuperAdmin: Boolean(user.is_super_admin),
    roleIds: roles.map((role) => role.id),
    roles,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }
}
export function toRoleDto(role: RoleRow): ManagedRole {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    sortOrder: role.sort_order,
    status: role.status,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
    userCount: db.userRoles.filter(
      (link) =>
        link.role_id === role.id &&
        db.users.some((user) => user.id === link.user_id && !user.deleted_at)
    ).length
  }
}
export function toMenuDto(menu: MenuRow): ManagedMenu {
  return {
    id: menu.id,
    parentId: menu.parent_id,
    type: menu.type,
    title: menu.title,
    name: menu.name,
    path: menu.path,
    component: menu.component,
    redirect: menu.redirect,
    routeQuery: menu.route_query,
    activeMenu: menu.active_menu,
    icon: menu.icon,
    permission: menu.permission,
    visible: Boolean(menu.visible),
    alwaysShow: Boolean(menu.always_show),
    keepAlive: Boolean(menu.keep_alive),
    fixedTab: Boolean(menu.fixed_tab),
    sortOrder: menu.sort_order,
    status: menu.status,
    createdAt: menu.created_at,
    updatedAt: menu.updated_at
  }
}
export function menuTree(parentId: number | null = null): ManagedMenu[] {
  return db.menus
    .filter((menu) => !menu.deleted_at && menu.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((menu) => {
      const children = menuTree(menu.id)
      return { ...toMenuDto(menu), ...(children.length ? { children } : {}) }
    })
}
export function departmentSubtreeIds(rootId: number): Set<number> {
  const ids = new Set<number>([rootId])
  for (const id of ids)
    for (const item of db.departments) {
      if (!item.deleted_at && item.parent_id === id) ids.add(item.id)
    }
  return ids
}
export function toDepartmentDto(row: DepartmentRow): ManagedDepartment {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    code: row.code,
    leader: row.leader,
    phone: row.phone,
    email: row.email,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userCount: db.users.filter((user) => !user.deleted_at && user.department_id === row.id).length
  }
}
export function departmentTree(parentId: number | null = null): DepartmentOption[] {
  return db.departments
    .filter((item) => !item.deleted_at && item.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      parentId: item.parent_id,
      name: item.name,
      code: item.code,
      leader: item.leader,
      phone: item.phone,
      email: item.email,
      sortOrder: item.sort_order,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      children: departmentTree(item.id)
    }))
}
export function dynamicRoutes(user: UserRow): DynamicRoute[] {
  const ids = grantedMenuIds(user)
  // 为已授权节点补全目录祖先，但不从目录向下扩张授权。
  for (const id of [...ids]) {
    let menu = db.menus.find((item) => item.id === id)
    while (menu?.parent_id !== null && menu?.parent_id !== undefined) {
      ids.add(menu.parent_id)
      menu = db.menus.find((item) => item.id === menu!.parent_id)
    }
  }
  function build(parentId: number | null): DynamicRoute[] {
    return db.menus
      .filter(
        (menu) =>
          menu.parent_id === parentId && menu.type !== 3 && ids.has(menu.id) && isActiveMenu(menu)
      )
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .flatMap((menu) => {
        const children = build(menu.id)
        if (menu.type === 1 && !children.length) return []
        return [
          {
            path: menu.path!,
            name: menu.name ?? undefined,
            title: menu.title,
            component: menu.component ?? undefined,
            redirect: menu.redirect ?? undefined,
            icon: menu.icon ?? undefined,
            routeQuery: menu.route_query ?? undefined,
            activeMenu: menu.active_menu ?? undefined,
            hidden: !menu.visible,
            alwaysShow: Boolean(menu.always_show),
            keepAlive: Boolean(menu.keep_alive),
            fixedTab: Boolean(menu.fixed_tab),
            order: menu.sort_order,
            ...(children.length ? { children } : {}),
            permissions: db.menus
              .filter(
                (node) =>
                  node.parent_id === menu.id &&
                  node.type === 3 &&
                  ids.has(node.id) &&
                  isActiveMenu(node)
              )
              .map((node) => ({ name: node.title, permission: node.permission! }))
          }
        ]
      })
  }
  return build(null)
}
