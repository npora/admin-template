import type { AuditFields, SystemStatus } from './system'

export interface DepartmentInput {
  parentId: number | null
  name: string
  code: string | null
  leader: string | null
  phone: string | null
  email: string | null
  sortOrder: number
  status: SystemStatus
}
export interface DepartmentOption extends DepartmentInput, AuditFields {
  id: number
  children?: DepartmentOption[]
}
export interface ManagedDepartment extends DepartmentOption {
  userCount: number
  children?: ManagedDepartment[]
}
