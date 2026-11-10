import type { MockAdapter } from '@npora/request/testing'
import type { DefaultApiResponse } from '@/api/types/common'
import type { DepartmentInput, ManagedDepartment } from '@/api/types/department'
import { db, audit } from '../rbac/database'
import { departmentTree, toDepartmentDto } from '../rbac/access'
import { isId, isStatus, isSortOrder, text, optionalText, nullable } from '../rbac/validation'
import {
  mockSuccess as success,
  mockFailure as failure,
  requireMockPermission as authorize,
  requireAnyMockPermission
} from '../utils'

function validate(input: unknown, id?: number): string | undefined {
  if (!input || typeof input !== 'object') return '部门数据不正确'
  const value = input as DepartmentInput
  if (
    !text(value.name, 100) ||
    !optionalText(value.code, 64) ||
    !optionalText(value.leader, 100) ||
    !optionalText(value.phone, 32) ||
    !optionalText(value.email, 255) ||
    !isStatus(value.status) ||
    !isSortOrder(value.sortOrder)
  )
    return '请检查部门名称、资料、排序和状态'
  if (value.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()))
    return '邮箱格式不正确'
  if (
    value.code?.trim() &&
    db.departments.some(
      (item) => item.id !== id && item.code?.toLowerCase() === value.code!.trim().toLowerCase()
    )
  )
    return '部门编码已存在'
  if (
    value.parentId !== null &&
    (!isId(value.parentId) ||
      !db.departments.some((item) => item.id === value.parentId && !item.deleted_at))
  )
    return '上级部门不存在'
  let parentId = value.parentId
  const visited = new Set<number>()
  while (parentId !== null) {
    if (parentId === id || visited.has(parentId)) return '上级部门不能指向自己或下级部门'
    visited.add(parentId)
    parentId = db.departments.find((item) => item.id === parentId)?.parent_id ?? null
  }
}
function fields(input: DepartmentInput) {
  return {
    parent_id: input.parentId,
    name: input.name.trim(),
    code: nullable(input.code),
    leader: nullable(input.leader),
    phone: nullable(input.phone),
    email: nullable(input.email),
    sort_order: input.sortOrder,
    status: input.status
  }
}
export function setupDepartmentMock(adapter: MockAdapter): void {
  adapter.onGet('/system/departments/options').reply((config) => {
    const denied = requireAnyMockPermission(config, [
      'system:user:list',
      'system:user:create',
      'system:user:update',
      'system:department:list',
      'system:department:create',
      'system:department:update'
    ])
    return denied ?? success(departmentTree())
  })
  adapter.onGet('/system/departments').reply((config) => {
    const denied = authorize(config, 'system:department:list')
    return (
      denied ??
      success(
        departmentTree().map(function map(node): ManagedDepartment {
          return {
            ...node,
            userCount: db.users.filter((user) => !user.deleted_at && user.department_id === node.id)
              .length,
            children: node.children?.map(map)
          }
        })
      )
    )
  })
  adapter.onPost('/system/departments').reply<DefaultApiResponse<ManagedDepartment>>((config) => {
    const denied = authorize(config, 'system:department:create')
    if (denied) return denied
    const message = validate(config.json)
    if (message) return failure(message)
    const row = {
      id: Math.max(0, ...db.departments.map((item) => item.id)) + 1,
      ...fields(config.json as DepartmentInput),
      ...audit()
    }
    db.departments.push(row)
    return success(toDepartmentDto(row))
  })
  adapter
    .onPut(/^\/system\/departments\/\d+$/)
    .reply<DefaultApiResponse<ManagedDepartment>>((config) => {
      const denied = authorize(config, 'system:department:update')
      if (denied) return denied
      const id = Number(String(config.url).split('/').pop())
      const row = db.departments.find((item) => item.id === id && !item.deleted_at)
      if (!row) return failure('部门不存在或已被删除', 10004)
      const message = validate(config.json, id)
      if (message) return failure(message)
      Object.assign(row, fields(config.json as DepartmentInput), {
        updated_at: new Date().toISOString()
      })
      return success(toDepartmentDto(row))
    })
  adapter.onDelete(/^\/system\/departments\/\d+$/).reply((config) => {
    const denied = authorize(config, 'system:department:delete')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const row = db.departments.find((item) => item.id === id && !item.deleted_at)
    if (!row) return failure('部门不存在或已被删除', 10004)
    if (db.departments.some((item) => item.parent_id === id && !item.deleted_at))
      return failure('请先移除下级部门')
    if (db.users.some((user) => user.department_id === id && !user.deleted_at))
      return failure('部门仍有关联用户，请先调整用户所属部门')
    row.deleted_at = row.updated_at = new Date().toISOString()
    return success(null)
  })
}
