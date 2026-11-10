import type { MockAdapter } from '@npora/request/testing'
import type { DefaultApiResponse, PageResult } from '@/api/types/common'
import type { ManagedRole, RoleInput } from '@/api/types/role'
import { db, audit } from '../rbac/database'
import { menuTree, toRoleDto } from '../rbac/access'
import {
  isId,
  isStatus,
  isSortOrder,
  text,
  optionalText,
  pageQuery,
  nullable
} from '../rbac/validation'
import {
  mockSuccess as success,
  mockFailure as failure,
  requireMockPermission as authorize,
  requireAnyMockPermission
} from '../utils'

function validate(input: unknown): input is RoleInput {
  if (!input || typeof input !== 'object') return false
  const value = input as RoleInput
  return (
    text(value.code, 64) &&
    /^[a-zA-Z][a-zA-Z0-9:_-]{0,63}$/.test(value.code) &&
    text(value.name, 100) &&
    optionalText(value.description, 255) &&
    isSortOrder(value.sortOrder) &&
    isStatus(value.status)
  )
}
export function setupRoleMock(adapter: MockAdapter): void {
  adapter.onGet('/system/roles/options').reply((config) => {
    const denied = requireAnyMockPermission(config, [
      'system:user:list',
      'system:user:create',
      'system:user:update'
    ])
    if (denied) return denied
    return success(
      db.roles
        .filter((role) => !role.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((role) => ({ id: role.id, name: role.name, code: role.code, status: role.status }))
    )
  })
  adapter.onGet('/system/roles/menu-options').reply((config) => {
    const denied = authorize(config, 'system:role:grant')
    return denied ?? success(menuTree())
  })
  adapter.onGet('/system/roles').reply<DefaultApiResponse<PageResult<ManagedRole>>>((config) => {
    const denied = authorize(config, 'system:role:list')
    if (denied) return denied
    const query = config.query ?? {},
      pagination = pageQuery(query)
    if (!pagination) return failure('分页参数不正确')
    const keyword = String(query.keyword ?? '')
      .trim()
      .toLowerCase()
    const list = db.roles
      .filter(
        (role) =>
          !role.deleted_at &&
          (!keyword || `${role.code} ${role.name}`.toLowerCase().includes(keyword)) &&
          (query.status === undefined ||
            query.status === '' ||
            role.status === Number(query.status))
      )
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map(toRoleDto)
    const start = (pagination.page - 1) * pagination.pageSize
    return success({ list: list.slice(start, start + pagination.pageSize), total: list.length })
  })
  adapter.onPost('/system/roles').reply<DefaultApiResponse<ManagedRole>>((config) => {
    const denied = authorize(config, 'system:role:create')
    if (denied) return denied
    const input = config.json
    if (!validate(input)) return failure('请检查角色编码、名称、说明、排序和状态')
    if (db.roles.some((role) => role.code.toLowerCase() === input.code.toLowerCase()))
      return failure('角色编码已存在')
    const role = {
      id: Math.max(0, ...db.roles.map((item) => item.id)) + 1,
      code: input.code,
      name: input.name.trim(),
      description: nullable(input.description),
      sort_order: input.sortOrder,
      status: input.status,
      ...audit()
    }
    db.roles.push(role)
    return success(toRoleDto(role))
  })
  adapter.onPut(/^\/system\/roles\/\d+$/).reply<DefaultApiResponse<ManagedRole>>((config) => {
    const denied = authorize(config, 'system:role:update')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop()),
      input = config.json
    const role = db.roles.find((item) => item.id === id && !item.deleted_at)
    if (!role) return failure('角色不存在或已被删除', 10004)
    if (!validate(input)) return failure('请检查角色字段')
    if (
      db.roles.some(
        (item) => item.id !== id && item.code.toLowerCase() === input.code.toLowerCase()
      )
    )
      return failure('角色编码已存在')
    Object.assign(role, {
      code: input.code,
      name: input.name.trim(),
      description: nullable(input.description),
      sort_order: input.sortOrder,
      status: input.status,
      updated_at: new Date().toISOString()
    })
    return success(toRoleDto(role))
  })
  adapter.onDelete(/^\/system\/roles\/\d+$/).reply((config) => {
    const denied = authorize(config, 'system:role:delete')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const role = db.roles.find((item) => item.id === id && !item.deleted_at)
    if (!role) return failure('角色不存在或已被删除', 10004)
    if (toRoleDto(role).userCount) return failure('角色已关联用户，请先调整用户角色')
    role.deleted_at = role.updated_at = new Date().toISOString()
    return success(null)
  })
  adapter.onGet(/^\/system\/roles\/\d+\/menus$/).reply((config) => {
    const denied = authorize(config, 'system:role:grant')
    if (denied) return denied
    const id = Number(String(config.url).split('/').at(-2))
    if (!db.roles.some((role) => role.id === id && !role.deleted_at))
      return failure('角色不存在或已被删除', 10004)
    return success(
      db.roleMenus
        .filter(
          (link) =>
            link.role_id === id &&
            db.menus.some((menu) => menu.id === link.menu_id && !menu.deleted_at)
        )
        .map((link) => link.menu_id)
    )
  })
  adapter.onPut(/^\/system\/roles\/\d+\/menus$/).reply((config) => {
    const denied = authorize(config, 'system:role:grant')
    if (denied) return denied
    const id = Number(String(config.url).split('/').at(-2))
    if (!db.roles.some((role) => role.id === id && !role.deleted_at))
      return failure('角色不存在或已被删除', 10004)
    const input = config.json as { menuIds?: unknown } | undefined
    if (
      !Array.isArray(input?.menuIds) ||
      input.menuIds.some(
        (id) => !isId(id) || !db.menus.some((menu) => menu.id === id && !menu.deleted_at)
      )
    )
      return failure('授权节点不存在或已被删除')
    const ids = new Set<number>(input.menuIds)
    for (const menuId of [...ids]) {
      let menu = db.menus.find((item) => item.id === menuId)
      while (menu?.parent_id !== null && menu?.parent_id !== undefined) {
        const parent = db.menus.find((item) => item.id === menu!.parent_id && !item.deleted_at)
        if (!parent) return failure('授权节点的父级不存在')
        ids.add(parent.id)
        menu = parent
      }
    }
    const previous = new Map(
      db.roleMenus
        .filter((link) => link.role_id === id)
        .map((link) => [link.menu_id, link.created_at])
    )
    db.roleMenus = db.roleMenus.filter((link) => link.role_id !== id)
    db.roleMenus.push(
      ...[...ids].map((menu_id) => ({
        role_id: id,
        menu_id,
        created_at: previous.get(menu_id) ?? new Date().toISOString()
      }))
    )
    return success([...ids])
  })
}
