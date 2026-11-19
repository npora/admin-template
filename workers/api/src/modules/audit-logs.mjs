import { HttpError, success } from '../http.mjs'
import { requirePermission } from '../security/access.mjs'
import { snapshot } from '../repositories/management.mjs'
import { authenticate } from './auth.mjs'
import { invalid, pagination } from './validation.mjs'

const actions = ['password_reset', 'totp_enable', 'totp_disable', 'role_grant', 'session_revoke']
const outcomes = ['success', 'failure']

export async function auditOperation(db, actorId, targetId, action, run) {
  const targetType = action === 'role_grant' ? 'role' : 'user'
  const insert = (result, status, requireChange = false) =>
    db
      .prepare(
        `INSERT INTO sys_audit_log(actor_id,target_type,target_id,action,result,status_code,created_at)
        SELECT ?1,?2,?3,?4,?5,?6,?7${requireChange ? ' WHERE changes() = 1' : ''}`
      )
      .bind(actorId, targetType, targetId, action, result, status, Date.now())

  try {
    // For guarded writes, SQLite changes() counts only direct changes to the preceding statement.
    return await run((requireChange) => insert('success', 200, requireChange))
  } catch (error) {
    try {
      await insert('failure', error instanceof HttpError ? error.status : 503).run()
    } catch {
      console.error({ event: 'audit.failure_write_failed' })
    }
    throw error
  }
}

function integerFilter(searchParams, name, minimum) {
  const inputs = searchParams.getAll(name)
  if (!inputs.length) return null
  const [input] = inputs
  const value = Number(input)
  if (
    inputs.length !== 1 ||
    !input ||
    /[^0-9]/.test(input) ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    invalid(`审计筛选参数 ${name} 不正确`)
  return value
}

export async function auditLogs(request, env) {
  const db = env.DB
  const actor = await authenticate(request, db)
  const { access } = await snapshot(db, actor)
  requirePermission(access, 'system:audit-log:list')
  const url = new URL(request.url)
  const { page, pageSize } = pagination(url)
  const action = url.searchParams.get('action')
  const result = url.searchParams.get('result')
  if (action && !actions.includes(action)) invalid('审计操作不正确')
  if (result && !outcomes.includes(result)) invalid('审计结果不正确')

  const createdFrom = integerFilter(url.searchParams, 'createdFrom', 0)
  const createdTo = integerFilter(url.searchParams, 'createdTo', 0)
  const actorId = integerFilter(url.searchParams, 'actorId', 1)
  const targetId = integerFilter(url.searchParams, 'targetId', 1)
  if (createdFrom !== null && createdTo !== null && createdFrom >= createdTo)
    invalid('审计开始时间必须早于结束时间')

  const conditions = []
  const values = []
  for (const [condition, value] of [
    ['action = ?', action || null],
    ['result = ?', result || null],
    ['actor_id = ?', actorId],
    ['target_id = ?', targetId],
    ['created_at >= ?', createdFrom],
    ['created_at < ?', createdTo]
  ]) {
    if (value === null) continue
    conditions.push(condition)
    values.push(value)
  }
  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const [count, rows] = await db.batch([
    db.prepare(`SELECT count(*) AS total FROM sys_audit_log ${filter}`).bind(...values),
    db
      .prepare(
        `SELECT id, actor_id AS actorId, target_type AS targetType, target_id AS targetId,
        action, result, status_code AS statusCode, created_at AS createdAt
        FROM sys_audit_log ${filter} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      )
      .bind(...values, pageSize, (page - 1) * pageSize)
  ])
  return success({ list: rows.results, total: count.results[0].total })
}
