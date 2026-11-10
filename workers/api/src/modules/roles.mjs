import { readJson, success } from '../http.mjs'
import { authenticate } from './auth.mjs'
import { requirePermission } from '../security/access.mjs'
import { snapshot, commit, insert, update, nowFields } from '../repositories/management.mjs'
import {
  fieldsOnly,
  text,
  optional,
  sort,
  status,
  ids,
  find,
  invalid,
  conflict,
  nullable,
  pagination,
  parentChain,
  requireAny
} from './validation.mjs'
import { tree, menuDto, roleOption, roleDto } from './dto.mjs'

export async function roles(request, env, routeId, operation) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor, { roleId: routeId })
  if (operation === 'options') {
    requireAny(state.access, ['system:user:list', 'system:user:create', 'system:user:update'])
    return success(state.roles.filter((role) => !role.deleted_at).map(roleOption))
  }
  if (operation === 'menu-options' || operation === 'menus') {
    requirePermission(state.access, 'system:role:grant')
    if (operation === 'menu-options') return success(tree(state.menus, menuDto))
    find(state.roles, routeId, '角色')
    const existingIds = state.roleMenus
      .filter(
        (link) =>
          link.role_id === routeId &&
          state.menus.some((row) => row.id === link.menu_id && !row.deleted_at)
      )
      .map((link) => link.menu_id)
    if (request.method === 'GET') return success(existingIds)
    const input = await readJson(request)
    fieldsOnly(input, ['menuIds'])
    if (!Array.isArray(input.menuIds) || input.menuIds.length > 1000) invalid('授权 ID 列表不正确')
    const menuIds = new Set(ids([...new Set(input.menuIds)]))
    for (const menuId of [...menuIds]) {
      let node = find(state.menus, menuId, '菜单')
      parentChain(state.menus, node.parent_id, node.id)
      while (node.parent_id !== null) {
        node = find(state.menus, node.parent_id, '父级')
        menuIds.add(node.id)
      }
    }
    await commit(env.DB, actor, state, [
      env.DB.prepare('DELETE FROM sys_role_menu WHERE role_id=?1').bind(routeId),
      env.DB.prepare(
        'INSERT INTO sys_role_menu(role_id, menu_id) SELECT ?1, value FROM json_each(?2)'
      ).bind(routeId, JSON.stringify([...menuIds]))
    ])
    return success([...menuIds])
  }
  requirePermission(
    state.access,
    `system:role:${{ GET: 'list', POST: 'create', PUT: 'update', DELETE: 'delete' }[request.method]}`
  )
  if (request.method === 'GET') {
    const query = pagination(new URL(request.url))
    const list = state.roles.filter(
      (role) =>
        !role.deleted_at &&
        (query.status === null || role.status === query.status) &&
        (!query.keyword ||
          `${role.name} ${role.code}`.toLowerCase().includes(query.keyword.toLowerCase()))
    )
    return success({
      total: list.length,
      list: list.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(roleDto)
    })
  }
  const existing = routeId ? find(state.roles, routeId, '角色') : undefined
  if (request.method === 'DELETE') {
    if (existing.user_count) conflict('角色已关联用户，请先调整用户角色')
    await commit(env.DB, actor, state, [
      update(env.DB, 'sys_role', routeId, { deleted_at: new Date().toISOString(), ...nowFields() })
    ])
    return success(null)
  }
  const input = await readJson(request)
  fieldsOnly(input, ['code', 'name', 'description', 'sortOrder', 'status'])
  if (
    !text(input.code, 64) ||
    !/^[A-Za-z][A-Za-z0-9:_-]{0,63}$/.test(input.code) ||
    !text(input.name, 100) ||
    !optional(input.description, 255) ||
    !sort(input.sortOrder) ||
    !status(input.status)
  )
    invalid('请检查角色编码、名称、说明、排序和状态')
  const row = {
    code: input.code,
    name: input.name.trim(),
    description: nullable(input.description),
    sort_order: input.sortOrder,
    status: input.status
  }
  const results = await commit(env.DB, actor, state, [
    existing
      ? update(env.DB, 'sys_role', routeId, { ...row, ...nowFields() })
      : insert(env.DB, 'sys_role', row)
  ])
  return success(roleDto({ ...results[0].results[0], user_count: existing?.user_count ?? 0 }))
}
