import type { PageParams } from './common'
import type { AuditFields, SystemStatus } from './system'

export type DictTagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'
export interface DictTypeInput {
  code: string
  name: string
  remark: string | null
  sortOrder: number
  status: SystemStatus
}
export interface DictType extends DictTypeInput, AuditFields {
  id: number
  itemCount: number
}
export interface DictItemInput {
  label: string
  value: string
  tagType: DictTagType
  remark: string | null
  sortOrder: number
  status: SystemStatus
}
export interface DictItem extends DictItemInput, AuditFields {
  id: number
  dictTypeId: number
}
export interface DictOption {
  label: string
  value: string
  tagType: DictTagType
}
export interface DictQuery extends PageParams {
  keyword?: string
  status?: SystemStatus
}
