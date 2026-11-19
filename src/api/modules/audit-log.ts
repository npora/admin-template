import { request } from '../client'
import type { AuditLogEntry, AuditLogListQuery } from '../types/audit-log'
import type { PageResult } from '../types/common'

export function getAuditLogs(
  query: AuditLogListQuery,
  signal?: AbortSignal
): Promise<PageResult<AuditLogEntry>> {
  return request.get<PageResult<AuditLogEntry>>('/system/audit-logs', {
    query: { ...query },
    signal
  })
}
