import type { MockAdapter } from '@npora/request/testing'
import type { DefaultApiResponse } from '@/api/types/common'
import type { ManagedMenu, MenuInput } from '@/api/types/menu'
import { joinRoutePath } from '@/router/utils/path'
import { db, audit } from '../rbac/database'
import { menuTree, toMenuDto } from '../rbac/access'
import { isId, isSortOrder, isStatus, optionalText, text } from '../rbac/validation'
import {
  mockFailure as failure,
  mockSuccess as success,
  requireMockPermission as authorize
} from '../utils'

const views = import.meta.glob('/src/views/**/index.vue')
function validate(input: unknown, id?: number): string | undefined {
  if (!input || typeof input !== 'object') return '菜单数据不正确'
  const value = input as MenuInput
  if (
    ![1, 2, 3].includes(value.type) ||
    !text(value.title, 100) ||
    !isStatus(value.status) ||
    !isSortOrder(value.sortOrder)
  )
    return '请检查类型、名称、状态和排序'
  for (const field of ['visible', 'alwaysShow', 'keepAlive', 'fixedTab'] as const)
    if (typeof value[field] !== 'boolean') return '菜单开关必须为布尔值'
  for (const [field, size] of [
    ['name', 100],
    ['path', 255],
    ['component', 255],
    ['redirect', 255],
    ['activeMenu', 255],
    ['icon', 100],
    ['permission', 150]
  ] as const)
    if (!optionalText(value[field], size)) return `字段 ${field} 不正确`
  if (
    value.routeQuery !== null &&
    (typeof value.routeQuery !== 'object' ||
      Array.isArray(value.routeQuery) ||
      Object.values(value.routeQuery).some(
        (item) =>
          !['string', 'number', 'boolean'].includes(typeof item) ||
          (typeof item === 'number' && !Number.isFinite(item))
      ))
  )
    return '默认 Query 必须为对象，值仅允许字符串、数字或布尔值'
  const parent = db.menus.find((menu) => menu.id === value.parentId && !menu.deleted_at)
  if (value.parentId !== null && (!isId(value.parentId) || !parent)) return '父级节点不存在'
  if (value.type === 3 && parent?.type !== 2) return '按钮必须归属页面'
  if (value.type !== 3 && parent && parent.type !== 1) return '目录和页面只能归属目录'
  const seen = new Set<number>()
  let ancestor = parent
  while (ancestor) {
    if (ancestor.id === id || seen.has(ancestor.id)) return '父级不能指向自己或后代节点'
    seen.add(ancestor.id)
    ancestor = db.menus.find((menu) => menu.id === ancestor!.parent_id && !menu.deleted_at)
  }
  const existing = db.menus.find((menu) => menu.id === id)
  if (
    existing &&
    existing.type !== value.type &&
    db.menus.some((menu) => menu.parent_id === id && !menu.deleted_at)
  )
    return '有子节点时不能更改节点类型'
  if (value.type === 3) {
    if (!text(value.permission, 150) || !/^[a-zA-Z0-9:_-]+$/.test(value.permission!))
      return '按钮必须提供有效的权限码'
    if (
      value.name !== null ||
      value.path !== null ||
      value.component !== null ||
      value.redirect !== null
    )
      return '按钮不能配置路由字段'
  } else {
    if (
      !text(value.path, 255) ||
      !/^[a-zA-Z0-9_/:.-]+$/.test(value.path!) ||
      value.path!.includes('//') ||
      /(?:^|\/)\.{1,2}(?:\/|$)/.test(value.path!)
    )
      return '请输入有效的路由路径'
    if (value.parentId === null && !value.path!.startsWith('/')) return '顶层路由必须使用绝对路径'
    if (value.permission !== null) return '权限码只配置在按钮节点'
    if (value.type === 1 && (value.component !== null || value.name !== null))
      return '目录不配置组件和路由名称'
    if (
      value.type === 2 &&
      (!text(value.name, 100) ||
        !text(value.component, 255) ||
        !views[`/src/views/${value.component}.vue`] ||
        value.component === 'login/index' ||
        value.component!.includes('/components/') ||
        value.redirect !== null)
    )
      return '页面必须提供唯一名称和已存在的页面入口，不能同时配置重定向'
    if (
      value.redirect &&
      (!value.redirect.startsWith('/') ||
        value.redirect.startsWith('//') ||
        /[\\\s]/.test(value.redirect))
    )
      return '重定向必须为站内绝对路径'
  }
  if (
    value.name &&
    ['Login', 'Layout', 'Dashboard', 'NotFound', 'RouteFallback'].includes(value.name)
  )
    return '路由名称与静态路由冲突'
  if (
    value.name &&
    db.menus.some(
      (menu) => menu.id !== id && menu.name?.toLowerCase() === value.name!.toLowerCase()
    )
  )
    return '路由名称已存在'
  if (
    value.permission &&
    db.menus.some(
      (menu) => menu.id !== id && menu.permission?.toLowerCase() === value.permission!.toLowerCase()
    )
  )
    return '权限码已存在'
  // 更新目录路径也会改变后代的完整路径，因此校验整棵候选树。
  const candidate = fromInput(value, id ?? Math.max(0, ...db.menus.map((menu) => menu.id)) + 1)
  const menus = [...db.menus.filter((menu) => menu.id !== id && !menu.deleted_at), candidate]
  const paths = new Set(['/', '/login', '/dashboard', '/404'])
  function fullPath(menuId: number): string {
    const menu = menus.find((item) => item.id === menuId)!
    return joinRoutePath(menu.parent_id === null ? '' : fullPath(menu.parent_id), menu.path ?? '')
  }
  for (const menu of menus.filter((item) => item.type !== 3)) {
    const path = fullPath(menu.id).toLowerCase()
    if (paths.has(path)) return '路由完整路径冲突'
    paths.add(path)
    if (menu.redirect && joinRoutePath('', menu.redirect) === fullPath(menu.id))
      return '重定向不能指向自身'
  }
  const next = new Map<string, string>()
  for (const menu of menus.filter((item) => item.type !== 3)) {
    const first = menus
      .filter((item) => item.parent_id === menu.id && item.type !== 3)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)[0]
    const target = menu.redirect
      ? joinRoutePath('', menu.redirect.split(/[?#]/)[0]!)
      : menu.type === 1 && first
        ? fullPath(first.id)
        : undefined
    if (target) next.set(fullPath(menu.id).toLowerCase(), target.toLowerCase())
  }
  for (const source of next.keys()) {
    const visited = new Set<string>()
    let current: string | undefined = source
    while (current && next.has(current)) {
      if (visited.has(current)) return '重定向不能形成循环'
      visited.add(current)
      current = next.get(current)
    }
  }
}
function fromInput(input: MenuInput, id: number) {
  return {
    id,
    parent_id: input.parentId,
    type: input.type,
    title: input.title.trim(),
    name: input.name,
    path: input.path,
    component: input.component,
    redirect: input.redirect,
    route_query: input.routeQuery,
    active_menu: input.activeMenu,
    icon: input.icon,
    permission: input.permission,
    visible: Number(input.visible) as 0 | 1,
    always_show: Number(input.alwaysShow) as 0 | 1,
    keep_alive: Number(input.keepAlive) as 0 | 1,
    fixed_tab: Number(input.fixedTab) as 0 | 1,
    sort_order: input.sortOrder,
    status: input.status,
    ...audit()
  }
}
export function setupMenuMock(adapter: MockAdapter): void {
  adapter.onGet('/system/menus').reply((config) => {
    const denied = authorize(config, 'system:menu:list')
    return denied ?? success(menuTree())
  })
  adapter.onPost('/system/menus').reply<DefaultApiResponse<ManagedMenu>>((config) => {
    const denied = authorize(config, 'system:menu:create')
    if (denied) return denied
    const message = validate(config.json)
    if (message) return failure(message)
    const row = fromInput(
      config.json as MenuInput,
      Math.max(0, ...db.menus.map((menu) => menu.id)) + 1
    )
    db.menus.push(row)
    return success(toMenuDto(row))
  })
  adapter.onPut(/^\/system\/menus\/\d+$/).reply<DefaultApiResponse<ManagedMenu>>((config) => {
    const denied = authorize(config, 'system:menu:update')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const row = db.menus.find((menu) => menu.id === id && !menu.deleted_at)
    if (!row) return failure('菜单不存在或已被删除', 10004)
    const message = validate(config.json, id)
    if (message) return failure(message)
    const createdAt = row.created_at
    Object.assign(row, fromInput(config.json as MenuInput, id), { created_at: createdAt })
    return success(toMenuDto(row))
  })
  adapter.onDelete(/^\/system\/menus\/\d+$/).reply((config) => {
    const denied = authorize(config, 'system:menu:delete')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const row = db.menus.find((menu) => menu.id === id && !menu.deleted_at)
    if (!row) return failure('菜单不存在或已被删除', 10004)
    if (db.menus.some((menu) => menu.parent_id === id && !menu.deleted_at))
      return failure('请先删除子节点')
    row.deleted_at = row.updated_at = new Date().toISOString()
    return success(null)
  })
}
