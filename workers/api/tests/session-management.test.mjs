import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { service } from './helpers/service.mjs'

const own = '/auth/sessions'
const managed = '/system/users/2/sessions'
const listed = (token, call) => call(own, { token }).then(({ body }) => body.data)
const loginToken = async (login, username) => (await login(username)).body.data.accessToken

test('personal session selectors are independent and revoke only the intended live sessions', async (t) => {
  const { call, login, viewer, editor, sqlite } = await service(t)
  const second = await loginToken(login, 'viewer')
  const rows = await listed(viewer, call)
  const current = rows.find((row) => row.current)
  const other = rows.find((row) => !row.current)
  assert.equal(rows.length, 2)
  assert.equal((await listed(viewer, call)).find((row) => row.current).id, current.id)
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ['createdAt', 'current', 'expiresAt', 'id'])
    assert.match(row.id, /^[a-f0-9]{32}$/)
    assert.notEqual(row.id, viewer)
    assert.ok(row.expiresAt > row.createdAt)
    const stored = sqlite
      .prepare('SELECT token_hash FROM sys_auth_session WHERE public_id = ?')
      .get(row.id)
    assert.ok(stored.token_hash)
    assert.notEqual(stored.token_hash, row.id)
  }
  const revoke = (id) => call(`${own}/${id}`, { method: 'DELETE', token: viewer })
  assert.equal((await call(own, { token: null })).status, 401)
  assert.equal((await revoke('invalid')).status, 400)
  assert.equal((await revoke(current.id)).status, 409)
  assert.equal((await revoke((await listed(editor, call))[0].id)).status, 404)
  assert.deepEqual((await revoke(other.id)).body.data, { revoked: 1 })
  assert.equal((await call('/auth/user', { token: second })).status, 401)
  assert.equal((await call('/auth/user', { token: editor })).status, 200)
  assert.equal((await revoke(other.id)).status, 404)

  const expired = await loginToken(login, 'viewer')
  const expiredId = (await listed(expired, call)).find((row) => row.current).id
  sqlite
    .prepare('UPDATE sys_auth_session SET created_at = 1, expires_at = 2 WHERE public_id = ?')
    .run(expiredId)
  assert.equal((await revoke(expiredId)).status, 404)
  const third = await loginToken(login, 'viewer')
  const fourth = await loginToken(login, 'viewer')
  assert.deepEqual((await revoke('others')).body.data, { revoked: 2 })
  assert.deepEqual((await revoke('others')).body.data, { revoked: 0 })
  assert.equal((await call('/auth/user', { token: viewer })).status, 200)
  assert.equal((await call('/auth/user', { token: third })).status, 401)
  assert.equal((await call('/auth/user', { token: fourth })).status, 401)
})

test('administrative session permissions are independent and revoke commits with audit', async (t) => {
  const { call, sqlite, viewer, editor } = await service(t)
  const viewerId = (await listed(viewer, call))[0].id
  const editorId = (await listed(editor, call))[0].id
  const revoke = (id, token) => call(`${managed}/${id}`, { method: 'DELETE', token })
  const grant = sqlite.prepare(
    `INSERT INTO sys_role_menu(role_id,menu_id)
     SELECT 2,id FROM sys_menu WHERE permission = ?`
  )

  assert.equal((await call(managed, { token: editor })).status, 403)
  assert.equal((await revoke(viewerId, editor)).status, 403)
  grant.run('system:user-session:list')
  assert.equal((await call(managed, { token: editor })).body.data[0].current, false)
  assert.equal((await revoke(viewerId, editor)).status, 403)
  assert.equal((await call('/system/users/1/sessions', { token: editor })).status, 403)
  grant.run('system:user-session:revoke')
  assert.equal((await revoke(editorId, editor)).status, 409)
  assert.equal((await revoke('invalid', editor)).status, 400)
  assert.equal((await revoke('0'.repeat(32), editor)).status, 404)

  sqlite.exec(`CREATE TRIGGER test_fail_session_audit BEFORE INSERT ON sys_audit_log
    WHEN NEW.action = 'session_revoke' AND NEW.result = 'success'
    BEGIN SELECT RAISE(ABORT,'test audit failure'); END`)
  assert.equal((await revoke(viewerId, editor)).status, 503)
  assert.equal((await call('/auth/user', { token: viewer })).status, 200)
  sqlite.exec('DROP TRIGGER test_fail_session_audit')
  assert.deepEqual((await revoke(viewerId, editor)).body.data, { revoked: 1 })
  assert.equal((await call('/auth/user', { token: viewer })).status, 401)
  assert.equal((await call('/auth/user', { token: editor })).status, 200)

  const logs = (await call('/system/audit-logs?action=session_revoke')).body.data.list
  assert.deepEqual(
    logs.map(({ result, statusCode }) => [result, statusCode]),
    [
      ['success', 200],
      ['failure', 503],
      ['failure', 404],
      ['failure', 400],
      ['failure', 409],
      ['failure', 403],
      ['failure', 403]
    ]
  )
  assert.ok(
    logs.every((row) => row.actorId === 3 && row.targetId === 2 && row.targetType === 'user')
  )
  for (const forbidden of [viewerId, editorId, viewer, editor]) {
    assert.ok(!JSON.stringify(logs).includes(forbidden))
  }
})

test('concurrent permission or session removal prevents a stale revocation', async (t) => {
  const { call, db, login, sqlite, viewer, editor } = await service(t)
  const target = (await listed(viewer, call))[0].id
  sqlite.exec(`INSERT INTO sys_role_menu(role_id,menu_id)
    SELECT 2,id FROM sys_menu WHERE permission IN ('system:user-session:list','system:user-session:revoke')`)
  const batch = db.batch
  let calls = 0
  db.batch = (statements) => {
    if (++calls === 2) {
      sqlite.exec(`DELETE FROM sys_role_menu WHERE role_id=2 AND menu_id=
        (SELECT id FROM sys_menu WHERE permission='system:user-session:revoke')`)
    }
    return batch(statements)
  }
  assert.equal(
    (await call(`${managed}/${target}`, { method: 'DELETE', token: editor })).status,
    409
  )
  db.batch = batch
  assert.equal((await call('/auth/user', { token: viewer })).status, 200)

  const other = await loginToken(login, 'viewer')
  db.batch = (statements) => {
    sqlite.prepare('DELETE FROM sys_auth_session WHERE public_id=?').run(target)
    return batch(statements)
  }
  assert.equal((await call(`${own}/others`, { method: 'DELETE', token: viewer })).status, 401)
  db.batch = batch
  assert.equal((await call('/auth/user', { token: other })).status, 200)
})

test('shared demo sessions stay private and cannot be revoked through the management endpoints', async (t) => {
  const { call, login, env, admin } = await service(t)
  env.AUTH_DEMO_PROTECTED_USERNAME = 'admin'
  const second = await loginToken(login, 'admin')
  const firstId = (await listed(admin, call))[0].id
  assert.equal((await listed(admin, call)).length, 1)
  assert.ok((await listed(second, call))[0].current)
  assert.notEqual(firstId, (await listed(second, call))[0].id)
  assert.equal((await call('/system/users/1/sessions', { token: admin })).body.data.length, 1)
  assert.equal((await call(`${own}/others`, { method: 'DELETE', token: second })).status, 403)
  assert.equal(
    (await call(`/system/users/1/sessions/${firstId}`, { method: 'DELETE', token: second })).status,
    403
  )
  assert.equal((await call('/auth/user', { token: admin })).status, 200)
  assert.equal((await call('/auth/logout', { method: 'POST', token: second })).status, 200)
})

test('session migration preserves old session credentials, audit history and audit sequence', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec('PRAGMA foreign_keys = ON')
    const directory = new URL('../migrations/', import.meta.url)
    const names = readdirSync(directory)
      .filter((name) => name.endsWith('.sql'))
      .sort()
    const apply = (name) => {
      sqlite.exec('BEGIN')
      sqlite.exec(readFileSync(new URL(name, directory), 'utf8'))
      sqlite.exec('COMMIT')
    }
    const migration = '0012_session_management.sql'
    for (const name of names.filter((name) => name < migration)) apply(name)
    sqlite.exec(`INSERT INTO sys_user(id,username,display_name,password_hash)
      VALUES(100,'upgrade_fixture','Upgrade fixture','test-only-value')`)
    const insert = () =>
      sqlite.prepare(`INSERT INTO sys_auth_session
      (token_hash,user_id,credential_fingerprint,created_at,expires_at) VALUES (?,100,?,1,2)`)
    insert().run('a'.repeat(64), 'b'.repeat(64))
    sqlite.exec(`INSERT INTO sys_audit_log(id,actor_id,target_type,target_id,action,result,status_code,created_at)
      VALUES(4,100,'user',100,'password_reset','success',200,1),
      (8,100,'user',100,'password_reset','success',200,2);
      DELETE FROM sys_audit_log WHERE id=8`)

    apply(migration)
    const migrated = sqlite.prepare('SELECT * FROM sys_auth_session').get()
    assert.equal(migrated.credential_fingerprint, 'b'.repeat(64))
    assert.equal(migrated.token_hash, 'a'.repeat(64))
    assert.match(migrated.public_id, /^[0-9a-f]{32}$/)
    insert().run('c'.repeat(64), 'b'.repeat(64))
    assert.equal(
      sqlite.prepare('SELECT count(DISTINCT public_id) AS count FROM sys_auth_session').get().count,
      2
    )
    sqlite.exec(`INSERT INTO sys_audit_log(actor_id,target_type,target_id,action,result,status_code,created_at)
      VALUES(100,'user',100,'session_revoke','success',200,3)`)
    const history = sqlite.prepare('SELECT id,action FROM sys_audit_log ORDER BY id').all()
    assert.deepEqual(
      history.map(({ id, action }) => [id, action]),
      [
        [4, 'password_reset'],
        [9, 'session_revoke']
      ]
    )
    const indexes = sqlite
      .prepare("SELECT count(*) AS count FROM pragma_index_list('sys_audit_log')")
      .get()
    assert.equal(indexes.count, 4)
  } finally {
    sqlite.close()
  }
})
