import assert from 'node:assert/strict'
import { test } from 'node:test'
import { totpCode } from '../src/security/totp.mjs'
import { password, service } from './helpers/service.mjs'

const auditPath = '/system/audit-logs'
const passwordPath = '/system/users/2/password'
const rolePath = '/system/roles/3/menus'
const totpPath = '/system/users/2/totp'
const newPassword = 'Audit-test-password-2026'
const permissions = (db) =>
  db.prepare("SELECT id FROM sys_menu WHERE permission='system:audit-log:list'").get().id

test('audit logs are read-only, independently authorized and sorted with a stable tie break', async (t) => {
  const { call, sqlite, viewer } = await service(t)
  assert.equal((await call(auditPath, { token: null })).status, 401)
  assert.equal((await call(auditPath, { token: viewer })).status, 403)
  assert.equal((await call(auditPath, { method: 'POST', json: {} })).status, 405)
  // The seeded admin role still requires an explicit grant when used without super-admin.
  sqlite.exec('INSERT INTO sys_user_role(user_id,role_id) VALUES(2,1)')
  assert.equal((await call(auditPath, { token: viewer })).status, 403)
  const listPermissionId = permissions(sqlite)
  const grant = await call(rolePath, { method: 'PUT', json: { menuIds: [listPermissionId] } })
  assert.equal(grant.status, 200)
  for (const query of ['page=0', 'pageSize=101', 'action=unknown', 'result=unknown'])
    assert.equal((await call(auditPath + '?' + query)).status, 400)

  assert.equal((await call(passwordPath, { method: 'POST', token: viewer, json: {} })).status, 403)
  assert.equal((await call(passwordPath, { method: 'POST', token: null, json: {} })).status, 401)
  sqlite.exec('UPDATE sys_audit_log SET created_at=123456789')
  const page = await call(auditPath + '?page=1&pageSize=1', { token: viewer })
  assert.deepEqual(page.body.data, {
    total: 2,
    list: [
      {
        id: 2,
        actorId: 2,
        targetType: 'user',
        targetId: 2,
        action: 'password_reset',
        result: 'failure',
        statusCode: 403,
        createdAt: 123456789
      }
    ]
  })
  const older = await call(auditPath + '?page=2&pageSize=1')
  assert.equal(older.body.data.list[0].action, 'role_grant')
  const filtered = await call(auditPath + '?action=role_grant&result=success')
  assert.equal(filtered.body.data.total, 1)
  assert.deepEqual(filtered.body.data.list[0], {
    id: 1,
    actorId: 1,
    targetType: 'role',
    targetId: 3,
    action: 'role_grant',
    result: 'success',
    statusCode: 200,
    createdAt: 123456789
  })
  const empty = await call(auditPath + '?action=role_grant&result=failure')
  assert.deepEqual(empty.body.data, { list: [], total: 0 })
  const menu = (await call('/auth/routes', { token: viewer })).body.data
    .flatMap((route) => route.children ?? [])
    .find((route) => route.name === 'SystemAuditLog')
  assert.equal(menu.path, 'audit-log')
  assert.equal(menu.component, 'system/audit-log/index')
  assert.deepEqual(menu.permissions, [{ name: '查看', permission: 'system:audit-log:list' }])
})

test('audit success and password reset commit together, and failures retain the original status', async (t) => {
  const { call, sqlite, viewer } = await service(t)
  const body = { currentPassword: password, newPassword }
  const reset = (json = body) => call(passwordPath, { method: 'POST', json })
  assert.equal((await reset({ ...body, currentPassword: 'wrong password' })).status, 400)
  sqlite.exec(`
    CREATE TRIGGER test_audit_log_failure BEFORE INSERT ON sys_audit_log
    WHEN new.result='success'
    BEGIN SELECT RAISE(ABORT,'fixture failure'); END;
  `)
  assert.equal((await reset()).status, 503)
  assert.equal((await call('/auth/user', { token: viewer })).status, 200)
  sqlite.exec('DROP TRIGGER test_audit_log_failure')
  assert.equal((await reset()).status, 200)
  assert.equal((await call('/auth/user', { token: viewer })).status, 401)
  const { list } = (await call(auditPath + '?action=password_reset')).body.data
  assert.deepEqual(
    list.map(({ result, statusCode }) => [result, statusCode]),
    [
      ['success', 200],
      ['failure', 503],
      ['failure', 400]
    ]
  )
  const serialized = JSON.stringify(list)
  for (const privateValue of [password, newPassword, viewer, 'fixture failure', 'wrong password'])
    assert.equal(serialized.includes(privateValue), false)
})

test('TOTP mutations log outcomes while pending self-enrollment and read-only endpoints remain unlogged', async (t) => {
  const { call, env, sqlite, editor } = await service(t)
  for (const path of ['/auth/totp/enable', totpPath + '/setup'])
    assert.equal((await call(path, { method: 'POST', token: null, json: {} })).status, 404)
  assert.equal(
    (await call(totpPath + '/setup', { method: 'POST', json: { password } })).status,
    404
  )
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  assert.equal(
    (await call('/auth/totp/setup', { method: 'POST', json: { password }, token: editor })).status,
    200
  )
  assert.equal((await call(totpPath)).status, 200)
  const setup = await call(totpPath + '/setup', { method: 'POST', json: { password } })
  assert.equal(setup.status, 200)
  assert.equal(
    (await call(totpPath + '/setup', { method: 'POST', json: { password } })).status,
    409
  )
  const { secret } = setup.body.data
  const code = await totpCode(secret, Math.floor(Date.now() / 30000))
  assert.equal(
    (await call(totpPath + '/disable', { method: 'POST', json: { password, code } })).status,
    200
  )
  const { list } = (await call(auditPath)).body.data
  assert.deepEqual(
    list.map(({ action, result, statusCode }) => [action, result, statusCode]),
    [
      ['totp_disable', 'success', 200],
      ['totp_enable', 'failure', 409],
      ['totp_enable', 'success', 200],
      ['totp_enable', 'failure', 404]
    ]
  )
  assert.equal(JSON.stringify(list).includes(secret), false)
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM sys_audit_log').get().count, 4)
})

test('audit filter and sort shapes use indexes without a temporary sort', async (t) => {
  const { sqlite } = await service(t)
  for (const [predicate, index] of [
    ['', 'idx_audit_log_time'],
    ["WHERE action='role_grant'", 'idx_audit_log_action_time'],
    ["WHERE result='success'", 'idx_audit_log_result_time'],
    ["WHERE action='role_grant' AND result='success'", 'idx_audit_log_action_result_time']
  ]) {
    const sql = `SELECT * FROM sys_audit_log ${predicate} ORDER BY created_at DESC,id DESC LIMIT 10`
    const detail = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .all()
      .map((row) => row.detail)
      .join(' ')
    assert.ok(detail.includes(index), detail)
    assert.equal(detail.includes('TEMP B-TREE'), false)
  }
})
