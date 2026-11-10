import { readJson, success } from '../http.mjs'
import { authenticate } from './auth.mjs'
import { requirePermission } from '../security/access.mjs'
import { snapshot, commit, insert, update, nowFields } from '../repositories/management.mjs'
import {
  fieldsOnly,
  text,
  optional,
  email,
  sort,
  status,
  find,
  invalid,
  conflict,
  nullable,
  parentChain,
  requireAny
} from './validation.mjs'
import { tree, departmentDto } from './dto.mjs'
const keys = ['parentId', 'name', 'code', 'leader', 'phone', 'email', 'sortOrder', 'status']
export async function departments(request, env, routeId, options = false) {
  const actor = await authenticate(request, env.DB)
  const state = await snapshot(env.DB, actor)
  if (options)
    requireAny(state.access, [
      'system:user:list',
      'system:user:create',
      'system:user:update',
      'system:department:list',
      'system:department:create',
      'system:department:update'
    ])
  else
    requirePermission(
      state.access,
      `system:department:${{ GET: 'list', POST: 'create', PUT: 'update', DELETE: 'delete' }[request.method]}`
    )
  if (request.method === 'GET') return success(tree(state.departments, departmentDto))
  const existing = routeId ? find(state.departments, routeId, '部门') : undefined
  if (request.method === 'DELETE') {
    if (
      existing.user_count ||
      state.departments.some((row) => row.parent_id === routeId && !row.deleted_at)
    )
      conflict('部门仍有下级部门或关联用户，请先调整关联')
    await commit(env.DB, actor, state, [
      update(env.DB, 'sys_department', routeId, {
        deleted_at: new Date().toISOString(),
        ...nowFields()
      })
    ])
    return success(null)
  }
  const input = await readJson(request)
  fieldsOnly(input, keys)
  if (
    !text(input.name, 100) ||
    !optional(input.code, 64) ||
    !optional(input.leader, 100) ||
    !optional(input.phone, 32) ||
    !optional(input.email, 255) ||
    !email(input.email) ||
    !sort(input.sortOrder) ||
    !status(input.status)
  )
    invalid('请检查部门名称、资料、排序和状态')
  parentChain(state.departments, input.parentId, routeId)
  const row = {
    parent_id: input.parentId,
    name: input.name.trim(),
    code: nullable(input.code),
    leader: nullable(input.leader),
    phone: nullable(input.phone),
    email: nullable(input.email),
    sort_order: input.sortOrder,
    status: input.status
  }
  const candidate = { id: existing?.id ?? -1, ...row }
  const nodes = [
    ...state.departments.filter((node) => !node.deleted_at && node.id !== existing?.id),
    candidate
  ]
  for (const node of nodes) parentChain(nodes, node.parent_id, node.id)
  const results = await commit(env.DB, actor, state, [
    existing
      ? update(env.DB, 'sys_department', routeId, { ...row, ...nowFields() })
      : insert(env.DB, 'sys_department', row)
  ])
  return success(departmentDto({ ...results[0].results[0], user_count: existing?.user_count ?? 0 }))
}
