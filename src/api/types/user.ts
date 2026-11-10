import type { PageParams } from './common'
import type { RoleOption } from './role'
import type { AuditFields, SystemStatus } from './system'

export interface UserFields {
  departmentId: number | null
  displayName: string
  avatar: string | null
  email: string | null
  mobile: string | null
  status: SystemStatus
  roleIds: number[]
}
export interface ManagedUser extends UserFields, AuditFields {
  id: number
  username: string
  isSuperAdmin: boolean
  lastLoginAt: string | null
  departmentName: string | null
  roles: RoleOption[]
}
export interface UserListQuery extends PageParams {
  keyword?: string
  roleId?: number
  departmentId?: number
  status?: SystemStatus
}
export interface CreateUserInput extends UserFields {
  username: string
  password: string
}
export type UpdateUserInput = UserFields
