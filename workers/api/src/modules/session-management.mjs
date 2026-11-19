import { HttpError, success, unauthorized } from '../http.mjs'
import { isProtectedDemoAccount } from '../config/auth.mjs'
import { commit, snapshot } from '../repositories/management.mjs'
import { assertCredentialsWritable, requirePermission } from '../security/access.mjs'
import { auditOperation } from './audit-logs.mjs'
import { authenticate } from './auth.mjs'

const readPermission = 'system:user-session:list'
const revokePermission = 'system:user-session:revoke'
const activeActorSql = `SELECT 1 FROM sys_auth_session s JOIN sys_user u ON u.id = s.user_id
  WHERE s.token_hash = ?1 AND s.user_id = ?2 AND s.expires_at > ?3
    AND u.status = 1 AND u.deleted_at IS NULL`

function activeActor(db, actor, now) {
  return db.prepare(activeActorSql).bind(actor.sessionHash, actor.id, now)
}

async function listSessions(db, actor, target, currentOnly, revision) {
  const now = Date.now()
  const [valid, rows, latestRevision] = await db.batch([
    activeActor(db, actor, now),
    db
      .prepare(
        `SELECT public_id AS id, created_at AS createdAt, expires_at AS expiresAt,
        token_hash = ?1 AS current FROM sys_auth_session
        WHERE user_id = ?2 AND expires_at > ?3 AND (?4 = 0 OR token_hash = ?1)
        ORDER BY created_at DESC, token_hash DESC`
      )
      .bind(actor.sessionHash, target.id, now, Number(currentOnly)),
    ...(revision === undefined
      ? []
      : [db.prepare('SELECT revision FROM sys_data_revision WHERE id = 1')])
  ])
  if (!valid.results.length) throw unauthorized()
  if (latestRevision && latestRevision.results[0].revision !== revision)
    throw new HttpError(409, '数据或权限已变化，请刷新后重试')
  return success(rows.results.map((row) => ({ ...row, current: row.current === 1 })))
}

function sessionDeletion(db, actor, userId, sessionId, now) {
  return db
    .prepare(
      `DELETE FROM sys_auth_session
      WHERE token_hash <> ?1 AND user_id = ?4 AND expires_at > ?3
        ${sessionId === null ? '' : 'AND public_id = ?5'}
        AND EXISTS (${activeActorSql})
      RETURNING public_id`
    )
    .bind(actor.sessionHash, actor.id, now, userId, ...(sessionId === null ? [] : [sessionId]))
}

function checkedSessionId(sessionId, actor) {
  if (!/^[0-9a-f]{32}$/.test(sessionId)) throw new HttpError(400, '会话编号格式错误')
  if (sessionId === actor.session_id) throw new HttpError(409, '请通过退出登录结束当前会话')
  return sessionId
}

function revokedSessions(rows, single) {
  if (single && !rows.results.length) throw new HttpError(404, '会话不存在或已失效')
  return success({ revoked: rows.results.length })
}

async function ownSessions(request, env, sessionId) {
  const { DB: db } = env
  const actor = await authenticate(request, db)
  if (sessionId === undefined)
    return listSessions(db, actor, actor, isProtectedDemoAccount(actor, env))
  assertCredentialsWritable(actor, env)
  const selected = sessionId === 'others' ? null : checkedSessionId(sessionId, actor)
  const now = Date.now()
  const [valid, rows] = await db.batch([
    activeActor(db, actor, now),
    sessionDeletion(db, actor, actor.id, selected, now)
  ])
  if (!valid.results.length) throw unauthorized()
  return revokedSessions(rows, selected !== null)
}

function managedTarget(state, actor, userId) {
  const target = state.users.find((user) => user.id === userId && user.deleted_at == null)
  if (!target) throw new HttpError(404, '用户不存在')
  if (target.is_super_admin === 1 && target.id !== actor.id)
    throw new HttpError(403, '不能管理其他超级管理员的会话')
  return target
}

async function managedSessions(request, env, rawUserId, sessionId) {
  const { DB: db } = env
  const actor = await authenticate(request, db)
  const userId = Number(rawUserId)
  if (!/^[1-9]\d*$/.test(rawUserId) || !Number.isSafeInteger(userId))
    throw new HttpError(400, '用户编号格式错误')

  if (sessionId === undefined) {
    const state = await snapshot(db, actor, { userId })
    requirePermission(state.access, readPermission)
    const target = managedTarget(state, actor, userId)
    return listSessions(db, actor, target, isProtectedDemoAccount(target, env), state.revision)
  }

  return auditOperation(db, actor.id, userId, 'session_revoke', async (auditSuccess) => {
    const state = await snapshot(db, actor, { userId })
    requirePermission(state.access, readPermission)
    requirePermission(state.access, revokePermission)
    const target = managedTarget(state, actor, userId)
    assertCredentialsWritable(target, env)
    const selected = checkedSessionId(sessionId, actor)
    const [rows] = await commit(db, actor, state, [
      sessionDeletion(db, actor, target.id, selected, Date.now()),
      auditSuccess(true)
    ])
    return revokedSessions(rows, true)
  })
}

export function sessionManagementRoute(path) {
  const own = /^\/auth\/sessions(?:\/([^/]+))?$/.exec(path)
  if (own) {
    const [, sessionId] = own
    return [
      sessionId === undefined ? 'GET' : 'DELETE',
      (req, env) => ownSessions(req, env, sessionId)
    ]
  }
  const managed = /^\/system\/users\/([^/]+)\/sessions(?:\/([^/]+))?$/.exec(path)
  if (managed) {
    const [, userId, sessionId] = managed
    return [
      sessionId === undefined ? 'GET' : 'DELETE',
      (req, env) => managedSessions(req, env, userId, sessionId)
    ]
  }
}
