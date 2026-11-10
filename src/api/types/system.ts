/** 对应 SQL TINYINT 状态：0=禁用，1=启用。 */
export type SystemStatus = 0 | 1
export interface AuditFields {
  createdAt: string
  updatedAt: string
}
