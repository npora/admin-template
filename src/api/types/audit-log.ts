import type { PageParams } from './common'

export const AUDIT_ACTIONS = [
  'password_reset',
  'totp_enable',
  'totp_disable',
  'role_grant',
  'session_revoke'
] as const
export const AUDIT_RESULTS = ['success', 'failure'] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type AuditResult = (typeof AUDIT_RESULTS)[number]
export type AuditTargetType = 'user' | 'role'

export interface AuditLogEntry {
  id: number
  actorId: number
  targetType: AuditTargetType
  targetId: number
  action: AuditAction
  result: AuditResult
  statusCode: number
  createdAt: number
}

export interface AuditLogListQuery extends PageParams {
  action?: AuditAction
  result?: AuditResult
}
