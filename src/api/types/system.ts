/** 对应 SQL TINYINT 状态：0=禁用，1=启用。 */
export type SystemStatus = 0 | 1
export interface AuditFields {
  /** Unix 毫秒时间戳，与 Date.now() 单位一致。 */
  createdAt: number
  updatedAt: number
}
