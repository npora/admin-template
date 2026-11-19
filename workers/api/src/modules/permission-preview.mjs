import { HttpError, success } from '../http.mjs'
import { snapshot } from '../repositories/management.mjs'
import {
  calculateAccess,
  effectiveRouteTree,
  isPermissionCode,
  requirePermission
} from '../security/access.mjs'
import { authenticate } from './auth.mjs'

const nodeTypes = { 1: 'directory', 2: 'menu', 3: 'permission' }

function addRole(sources, menuId, roleId) {
  const roles = sources.get(menuId) ?? new Set()
  roles.add(roleId)
  sources.set(menuId, roles)
}

function roleSources(access, links, routeIds) {
  const direct = new Map()
  const inherited = new Map()
  for (const { menu_id: menuId, role_id: roleId } of links) {
    if (!access.grants.has(menuId)) continue
    const menu = access.byId.get(menuId)
    if (menu.type !== 3 && !routeIds.has(menuId)) continue
    addRole(direct, menuId, roleId)

    let parentId = menu.parent_id
    while (parentId !== null) {
      addRole(inherited, parentId, roleId)
      parentId = access.byId.get(parentId).parent_id
    }
  }
  return { direct, inherited }
}

function routeMenus(nodes) {
  return nodes.flatMap(({ menu, children }) => [menu, ...routeMenus(children)])
}

function userAccessPreview(user, state) {
  const isSuperAdmin = user.is_super_admin === 1
  if (user.status !== 1) return { userId: user.id, isSuperAdmin, roles: [], entries: [] }

  const assigned = new Set(
    state.userRoles.filter((row) => row.user_id === user.id).map((row) => row.role_id)
  )
  const roles = state.roles.filter(
    (role) => assigned.has(role.id) && role.status === 1 && role.deleted_at == null
  )
  const roleIds = new Set(roles.map((role) => role.id))
  const links = state.roleMenus.filter((link) => roleIds.has(link.role_id))
  const access = calculateAccess(user, { roles, links, menus: state.menus })
  const routes = routeMenus(effectiveRouteTree(access))
  const { direct, inherited } = roleSources(access, links, new Set(routes.map(({ id }) => id)))
  const buttons = access.menus.filter(
    (menu) => menu.type === 3 && access.grants.has(menu.id) && isPermissionCode(menu.permission)
  )

  return {
    userId: user.id,
    isSuperAdmin,
    roles: roles.map(({ id, name }) => ({ id, name })),
    entries: [...routes, ...buttons].map((menu) => {
      const roleGrants = direct.get(menu.id)
      const sources = roleGrants ?? inherited.get(menu.id) ?? []
      return {
        id: menu.id,
        parentId: menu.parent_id,
        type: nodeTypes[menu.type],
        title: menu.title,
        permission: menu.type === 3 ? menu.permission : null,
        roleIds: isSuperAdmin ? [] : [...sources].sort((left, right) => left - right),
        source: isSuperAdmin ? 'superAdmin' : roleGrants ? 'role' : 'inherited'
      }
    })
  }
}

export async function permissionPreview(request, env, userId) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor, { userId, targetAccess: true })
  requirePermission(state.access, 'system:user:permission-preview')
  const target = state.users.find((row) => row.id === userId && row.deleted_at == null)
  if (!target) throw new HttpError(404, '用户不存在')
  return success(userAccessPreview(target, state))
}
