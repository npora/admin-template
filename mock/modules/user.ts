import type { MockAdapter } from '@npora/request/testing'
import type { DefaultApiResponse, PageResult } from '@/api/types/common'
import type { ManagedUser, UpdateUserInput, CreateUserInput } from '@/api/types/user'
import { db, audit } from '../rbac/database'
import { hashMockPassword } from '../rbac/password'
import { toUserDto, departmentSubtreeIds } from '../rbac/access'
import { isId, isStatus, text, optionalText, nullable, pageQuery } from '../rbac/validation'
import { getMockIdentity } from '../identity'
import {
  mockSuccess as success,
  mockFailure as failure,
  requireMockPermission as authorize
} from '../utils'

function validate(input: unknown, existingDepartmentId?: number | null): input is UpdateUserInput {
  if (!input || typeof input !== 'object') return false
  const value = input as UpdateUserInput
  return (
    text(value.displayName, 100) &&
    optionalText(value.avatar, 500) &&
    optionalText(value.email, 255) &&
    optionalText(value.mobile, 32) &&
    (value.email === null ||
      value.email === '' ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) &&
    isStatus(value.status) &&
    (value.departmentId === null ||
      (isId(value.departmentId) &&
        db.departments.some(
          (item) =>
            item.id === value.departmentId &&
            !item.deleted_at &&
            (item.status === 1 || item.id === existingDepartmentId)
        ))) &&
    Array.isArray(value.roleIds) &&
    value.roleIds.every(
      (id) => isId(id) && db.roles.some((role) => role.id === id && !role.deleted_at)
    ) &&
    new Set(value.roleIds).size === value.roleIds.length &&
    !('isSuperAdmin' in value) &&
    !('passwordHash' in value) &&
    !('password_hash' in value)
  )
}
function duplicate(input: UpdateUserInput, id?: number) {
  if (
    input.email?.trim() &&
    db.users.some(
      (user) => user.id !== id && user.email?.toLowerCase() === input.email!.trim().toLowerCase()
    )
  )
    return '邮箱已被使用'
  if (
    input.mobile?.trim() &&
    db.users.some((user) => user.id !== id && user.mobile === input.mobile!.trim())
  )
    return '手机号已被使用'
}
function canAssign(headers: HeadersInit | undefined, ids: number[], existing: number[] = []) {
  if (ids.length === existing.length && ids.every((id) => existing.includes(id))) return true
  const identity = getMockIdentity(headers)
  return (
    identity?.permissions.includes('*') ||
    identity?.permissions.includes('system:user:assign-roles')
  )
}
function assignRoles(userId: number, roleIds: number[]) {
  const previous = new Map(
    db.userRoles
      .filter((link) => link.user_id === userId)
      .map((link) => [link.role_id, link.created_at])
  )
  db.userRoles = db.userRoles.filter((link) => link.user_id !== userId)
  db.userRoles.push(
    ...roleIds.map((role_id) => ({
      user_id: userId,
      role_id,
      created_at: previous.get(role_id) ?? new Date().toISOString()
    }))
  )
}
function fields(input: UpdateUserInput) {
  return {
    department_id: input.departmentId,
    display_name: input.displayName.trim(),
    avatar: nullable(input.avatar),
    email: nullable(input.email),
    mobile: nullable(input.mobile),
    status: input.status
  }
}
export function setupUserMock(adapter: MockAdapter): void {
  adapter.onGet('/system/users').reply<DefaultApiResponse<PageResult<ManagedUser>>>((config) => {
    const denied = authorize(config, 'system:user:list')
    if (denied) return denied
    const query = config.query ?? {},
      pagination = pageQuery(query)
    if (!pagination) return failure('分页参数不正确')
    const departmentIds =
      query.departmentId === undefined || query.departmentId === ''
        ? undefined
        : departmentSubtreeIds(Number(query.departmentId))
    const keyword = String(query.keyword ?? '')
      .trim()
      .toLocaleLowerCase()
    const list = db.users
      .filter((user) => !user.deleted_at)
      .map(toUserDto)
      .filter(
        (user) =>
          (!keyword ||
            [user.username, user.displayName, user.email ?? '', user.mobile ?? ''].some((value) =>
              value.toLocaleLowerCase().includes(keyword)
            )) &&
          (query.roleId === undefined ||
            query.roleId === '' ||
            user.roleIds.includes(Number(query.roleId))) &&
          (query.departmentId === undefined ||
            query.departmentId === '' ||
            departmentIds?.has(user.departmentId ?? -1)) &&
          (query.status === undefined ||
            query.status === '' ||
            user.status === Number(query.status))
      )
      .sort((a, b) => b.id - a.id)
    const start = (pagination.page - 1) * pagination.pageSize
    return success({ list: list.slice(start, start + pagination.pageSize), total: list.length })
  })
  adapter.onPost('/system/users').reply<DefaultApiResponse<ManagedUser>>(async (config) => {
    const denied = authorize(config, 'system:user:create')
    if (denied) return denied
    const input = config.json as CreateUserInput
    if (
      !validate(input) ||
      !text(input.username, 64) ||
      !/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(input.username) ||
      typeof input.password !== 'string' ||
      input.password.length < 8 ||
      input.password.length > 128
    )
      return failure('请检查用户名、密码、资料、部门与角色')
    if (!validate(input)) return failure('部门或角色已发生变化，请重新选择')
    if (!canAssign(config.headers, input.roleIds)) return failure('没有分配角色的权限', 10003, 403)
    if (db.users.some((user) => user.username.toLowerCase() === input.username.toLowerCase()))
      return failure('用户名已存在')
    const conflict = duplicate(input)
    if (conflict) return failure(conflict)
    const passwordHash = await hashMockPassword(input.password)
    // 哈希计算结束后重新鉴权和校验唯一性，避免异步期间权限变化或并发创建。
    const lateDenied = authorize(config, 'system:user:create')
    if (lateDenied) return lateDenied
    if (!validate(input)) return failure('部门或角色已发生变化，请重新选择')
    if (!canAssign(config.headers, input.roleIds)) return failure('没有分配角色的权限', 10003, 403)
    if (db.users.some((user) => user.username.toLowerCase() === input.username.toLowerCase()))
      return failure('用户名已存在')
    const lateConflict = duplicate(input)
    if (lateConflict) return failure(lateConflict)
    const user = {
      id: Math.max(0, ...db.users.map((item) => item.id)) + 1,
      username: input.username,
      password_hash: passwordHash,
      ...fields(input),
      is_super_admin: 0 as const,
      last_login_at: null,
      ...audit()
    }
    db.users.push(user)
    assignRoles(user.id, input.roleIds)
    return success(toUserDto(user))
  })
  adapter.onPut(/^\/system\/users\/\d+$/).reply<DefaultApiResponse<ManagedUser>>((config) => {
    const denied = authorize(config, 'system:user:update')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const user = db.users.find((item) => item.id === id && !item.deleted_at)
    if (!user) return failure('用户不存在或已被删除', 10004)
    const input = config.json
    if (!validate(input, user.department_id) || 'username' in input || 'password' in input)
      return failure('请检查资料、部门与角色；用户名和密码不在此接口修改')
    if (user.is_super_admin && input.status !== 1) return failure('超级管理员必须保持启用')
    if (!canAssign(config.headers, input.roleIds, toUserDto(user).roleIds))
      return failure('没有分配角色的权限', 10003, 403)
    const conflict = duplicate(input, id)
    if (conflict) return failure(conflict)
    Object.assign(user, fields(input), { updated_at: new Date().toISOString() })
    assignRoles(id, input.roleIds)
    return success(toUserDto(user))
  })
  adapter.onDelete(/^\/system\/users\/\d+$/).reply((config) => {
    const denied = authorize(config, 'system:user:delete')
    if (denied) return denied
    const id = Number(String(config.url).split('/').pop())
    const user = db.users.find((item) => item.id === id && !item.deleted_at)
    if (!user) return failure('用户不存在或已被删除', 10004)
    if (user.is_super_admin) return failure('超级管理员不能删除')
    user.deleted_at = user.updated_at = new Date().toISOString()
    return success(null)
  })
}
