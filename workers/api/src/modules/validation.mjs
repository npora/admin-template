import { HttpError } from '../http.mjs'
export const invalid = (message = '请检查提交的字段') => {
  throw new HttpError(400, message)
}
export const conflict = (message) => {
  throw new HttpError(409, message)
}
export const id = (value) => Number.isSafeInteger(value) && value > 0
export const status = (value) => value === 0 || value === 1
export const sort = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 2147483647
export const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max
export const optional = (value, max) =>
  value === null || (typeof value === 'string' && value.length <= max)
export const nullable = (value) => value?.trim() || null
export const email = (value) => !value?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
export function fieldsOnly(input, keys) {
  if (Object.keys(input).some((key) => !keys.includes(key))) invalid('包含不允许修改的字段')
}
export function find(rows, target, label) {
  const row = rows.find((row) => row.id === target && !row.deleted_at)
  if (!row) throw new HttpError(404, `${label}不存在或已被删除`, 10004)
  return row
}
export function ids(value, max = 1000) {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((item) => !id(item)) ||
    new Set(value).size !== value.length
  )
    invalid('关联 ID 必须唯一且有效')
  return value
}
export function parentChain(rows, parentId, ownId) {
  const visited = new Set()
  let current = parentId
  while (current !== null) {
    if (current === ownId || visited.has(current)) invalid('父级不能指向自己或下级节点')
    if (!id(current) || visited.size >= 16) invalid('层级过深或父级不正确')
    visited.add(current)
    current = find(rows, current, '父级').parent_id
  }
}
export function descendants(rows, root) {
  const result = new Set([root])
  for (const parent of result)
    for (const row of rows) if (!row.deleted_at && row.parent_id === parent) result.add(row.id)
  return result
}
export function requireAny(access, permissions) {
  if (
    !access.permissions.includes('*') &&
    !permissions.some((permission) => access.permissions.includes(permission))
  )
    throw new HttpError(403, '没有执行此操作的权限')
}
export function pagination(url) {
  const query = url.searchParams
  const integer = (name, fallback, max) => {
    const raw = query.get(name)
    if (raw === null || raw === '') return fallback
    const value = Number(raw)
    if (!/^\d+$/.test(raw) || !id(value) || value > max) invalid('分页参数不正确')
    return value
  }
  const page = integer('page', 1, 1000000),
    pageSize = integer('pageSize', 10, 100)
  const keyword = query.get('keyword')?.trim() || ''
  if (keyword.length > 100) invalid('关键词过长')
  const filterId = (name) => {
    const raw = query.get(name)
    if (raw === null || raw === '') return null
    if (!/^\d+$/.test(raw) || !id(Number(raw))) invalid('筛选参数不正确')
    return Number(raw)
  }
  const raw = query.get('status')
  if (raw !== null && raw !== '' && !['0', '1'].includes(raw)) invalid('状态不正确')
  return {
    page,
    pageSize,
    keyword,
    roleId: filterId('roleId'),
    departmentId: filterId('departmentId'),
    status: raw === null || raw === '' ? null : Number(raw)
  }
}
