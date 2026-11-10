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
  find,
  invalid,
  conflict,
  parentChain
} from './validation.mjs'
import { tree, menuDto } from './dto.mjs'
import { pageComponents, staticNames, staticPaths } from '../config/pages.mjs'

const join = (parent, path) =>
  (path.startsWith('/') ? path : `${parent.replace(/\/$/, '')}/${path}`).replace(/\/$/, '') || '/'
const normalized = (path) => path.toLowerCase().replace(/:[a-z0-9_]+/g, ':param')
function validate(input, state, existing) {
  fieldsOnly(input, [
    'parentId',
    'type',
    'title',
    'name',
    'path',
    'component',
    'redirect',
    'routeQuery',
    'activeMenu',
    'icon',
    'permission',
    'visible',
    'alwaysShow',
    'keepAlive',
    'fixedTab',
    'sortOrder',
    'status'
  ])
  if (
    ![1, 2, 3].includes(input.type) ||
    !text(input.title, 100) ||
    !sort(input.sortOrder) ||
    !status(input.status)
  )
    invalid('请检查菜单类型、名称、排序和状态')
  for (const key of ['visible', 'alwaysShow', 'keepAlive', 'fixedTab'])
    if (typeof input[key] !== 'boolean') invalid('菜单开关必须为布尔值')
  for (const [key, length] of [
    ['name', 100],
    ['path', 255],
    ['component', 255],
    ['redirect', 255],
    ['activeMenu', 255],
    ['icon', 100],
    ['permission', 150]
  ])
    if (!optional(input[key], length)) invalid(`字段 ${key} 不正确`)
  if (
    input.routeQuery !== null &&
    (!input.routeQuery ||
      typeof input.routeQuery !== 'object' ||
      Array.isArray(input.routeQuery) ||
      Object.entries(input.routeQuery).some(
        ([key, value]) =>
          ['__proto__', 'constructor', 'prototype'].includes(key) ||
          !['string', 'number', 'boolean'].includes(typeof value) ||
          (typeof value === 'number' && !Number.isFinite(value))
      ))
  )
    invalid('默认 Query 仅允许字符串、数字和布尔值')
  const parent = input.parentId === null ? null : find(state.menus, input.parentId, '父级菜单')
  parentChain(state.menus, input.parentId, existing?.id)
  if (input.type === 3 && parent?.type !== 2) invalid('按钮必须归属页面')
  if (input.type !== 3 && parent && parent.type !== 1) invalid('目录和页面只能归属目录')
  if (
    existing &&
    existing.type !== input.type &&
    state.menus.some((menu) => !menu.deleted_at && menu.parent_id === existing.id)
  )
    invalid('有子节点时不能更改节点类型')
  if (input.type === 3) {
    if (
      !text(input.permission, 150) ||
      !/^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/.test(input.permission)
    )
      invalid('按钮须提供有效的权限码')
    if (
      ['name', 'path', 'component', 'redirect', 'routeQuery', 'activeMenu'].some(
        (key) => input[key] !== null
      )
    )
      invalid('按钮不能配置路由字段')
  } else {
    if (
      !text(input.path, 255) ||
      !/^[A-Za-z0-9_/:.-]+$/.test(input.path) ||
      input.path.includes('//') ||
      /(?:^|\/)\.{1,2}(?:\/|$)/.test(input.path)
    )
      invalid('请输入有效的路由路径')
    if (!parent && !input.path.startsWith('/')) invalid('顶层路由必须使用绝对路径')
    if (input.permission !== null) invalid('权限码只配置在按钮节点')
    if (input.type === 1 && (input.component !== null || input.name !== null))
      invalid('目录不配置组件和路由名称')
    if (
      input.type === 2 &&
      (!text(input.name, 100) ||
        !/^[A-Za-z][A-Za-z0-9_:-]*$/.test(input.name) ||
        !pageComponents.has(input.component) ||
        input.redirect !== null)
    )
      invalid('页面须提供有效名称和已登记的组件，不能配置重定向')
    if (
      input.redirect &&
      (!input.redirect.startsWith('/') ||
        input.redirect.startsWith('//') ||
        /[\\\s\u0000-\u001f]/.test(input.redirect) ||
        input.redirect.includes('%'))
    )
      invalid('重定向必须使用站内绝对路径')
  }
  if (
    input.activeMenu &&
    (!input.activeMenu.startsWith('/') ||
      input.activeMenu.startsWith('//') ||
      /[\\\s?#%]/.test(input.activeMenu))
  )
    invalid('高亮菜单必须是站内绝对路径')
  if (input.name && staticNames.has(input.name.toLowerCase())) conflict('路由名称与静态路由冲突')
  for (const key of ['name', 'permission'])
    if (
      input[key] &&
      state.menus.some(
        (row) => row.id !== existing?.id && row[key]?.toLowerCase() === input[key].toLowerCase()
      )
    )
      conflict('路由名称或权限码已存在')
  const candidate = { id: existing?.id ?? -1, ...fromInput(input) }
  const nodes = [
    ...state.menus.filter((row) => row.id !== existing?.id && !row.deleted_at),
    candidate
  ]
  const byId = new Map(nodes.map((row) => [row.id, row]))
  const fullPath = (row) =>
    join(row.parent_id === null ? '' : fullPath(byId.get(row.parent_id)), row.path || '')
  const paths = new Set(staticPaths.map(normalized))
  for (const row of nodes) {
    parentChain(nodes, row.parent_id, row.id)
    if (row.type === 3) continue
    const path = normalized(fullPath(row))
    if (paths.has(path)) conflict('路由完整路径冲突')
    paths.add(path)
  }
  const next = new Map()
  for (const row of nodes.filter((node) => node.type !== 3)) {
    const first = nodes
      .filter((node) => node.parent_id === row.id && node.type !== 3)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)[0]
    const target = row.redirect
      ? join('', row.redirect.split(/[?#]/)[0])
      : row.type === 1 && first
        ? fullPath(first)
        : null
    if (target) next.set(normalized(fullPath(row)), normalized(target))
  }
  for (const source of next.keys()) {
    const visited = new Set()
    let current = source
    while (next.has(current)) {
      if (visited.has(current)) invalid('重定向不能形成循环')
      visited.add(current)
      current = next.get(current)
    }
  }
}
function fromInput(input) {
  return {
    parent_id: input.parentId,
    type: input.type,
    title: input.title.trim(),
    name: input.name,
    path: input.path,
    component: input.component,
    redirect: input.redirect,
    route_query: input.routeQuery === null ? null : JSON.stringify(input.routeQuery),
    active_menu: input.activeMenu,
    icon: input.icon,
    permission: input.permission,
    visible: Number(input.visible),
    always_show: Number(input.alwaysShow),
    keep_alive: Number(input.keepAlive),
    fixed_tab: Number(input.fixedTab),
    sort_order: input.sortOrder,
    status: input.status
  }
}
export async function menus(request, env, routeId) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor)
  requirePermission(
    state.access,
    `system:menu:${{ GET: 'list', POST: 'create', PUT: 'update', DELETE: 'delete' }[request.method]}`
  )
  if (request.method === 'GET') return success(tree(state.menus, menuDto))
  const existing = routeId ? find(state.menus, routeId, '菜单') : undefined
  if (request.method === 'DELETE') {
    if (state.menus.some((row) => row.parent_id === routeId && !row.deleted_at))
      conflict('请先删除子节点')
    await commit(env.DB, actor, state, [
      update(env.DB, 'sys_menu', routeId, { deleted_at: new Date().toISOString(), ...nowFields() })
    ])
    return success(null)
  }
  const input = await readJson(request)
  validate(input, state, existing)
  const results = await commit(env.DB, actor, state, [
    existing
      ? update(env.DB, 'sys_menu', routeId, { ...fromInput(input), ...nowFields() })
      : insert(env.DB, 'sys_menu', fromInput(input))
  ])
  return success(menuDto(results[0].results[0]))
}
