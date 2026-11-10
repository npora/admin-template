import type { PageParams } from './common'
import type { AuditFields, SystemStatus } from './system'

export interface RoleInput {
  code: string
  name: string
  description: string | null
  sortOrder: number
  status: SystemStatus
}
export interface ManagedRole extends RoleInput, AuditFields {
  id: number
  userCount: number
}
export interface RoleOption {
  id: number
  code: string
  name: string
  status: SystemStatus
}
export interface RoleListQuery extends PageParams {
  keyword?: string
  status?: SystemStatus
}
