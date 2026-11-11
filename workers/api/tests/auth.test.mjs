import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../src/index.mjs'
import { database } from './helpers/database.mjs'
import { digest, hashPassword, verifyPassword } from '../src/security/crypto.mjs'
import { authorization, requirePermission } from '../src/security/access.mjs'

const pepper = 'a1'.repeat(32)
const password = 'Test-only-password-2026'
const passwordHash = await hashPassword(password, pepper)
function fixture(t) {
  const storage = database()
  t.after(() => storage.close())
  const { sqlite } = storage
  sqlite
    .prepare(
      `INSERT INTO sys_user(id, username, password_hash, display_name, is_super_admin)
    VALUES (1, 'admin', ?, 'Admin', 1), (2, 'viewer', ?, 'Viewer', 0)`
    )
    .run(passwordHash, passwordHash)
  sqlite.exec('INSERT INTO sys_user_role(user_id, role_id) VALUES (1, 1), (2, 3)')
  const env = {
    DB: storage.db,
    AUTH_PEPPER: pepper,
    CORS_ORIGINS: 'http://localhost:3000,https://admin.example.test'
  }
  async function call(path, { method = 'GET', json, token, origin, headers = {}, body } = {}) {
    const response = await worker.fetch(
      new Request(`https://api.example.test${path}`, {
        method,
        headers: {
          'CF-Connecting-IP': '192.0.2.1',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(origin ? { Origin: origin } : {}),
          ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers
        },
        ...(json !== undefined
          ? { body: JSON.stringify(json) }
          : body !== undefined
            ? { body }
            : {})
      }),
      env
    )
    return { response, body: response.status === 204 ? null : await response.json() }
  }
  const signIn = (username = 'viewer', options = {}) =>
    call('/auth/login', {
      method: 'POST',
      json: { username, password },
      ...options
    })
  return { ...storage, env, call, signIn }
}

test('login returns a random token, stores only its hash and returns exact public DTOs', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const { response, body } = await signIn('AdMiN')
  assert.equal(response.status, 200)
  const token = body.data.accessToken
  assert.match(token, /^[a-f0-9]{64}$/)
  const row = sqlite.prepare('SELECT * FROM sys_auth_session').get()
  assert.equal(row.token_hash, await digest(token))
  assert.notEqual(row.token_hash, token)
  assert.equal(row.expires_at - row.created_at, 3_600_000)
  assert.ok(sqlite.prepare('SELECT last_login_at FROM sys_user WHERE id=1').get().last_login_at)
  const user = await call('/api/auth/user', { token })
  assert.equal(user.response.status, 200)
  assert.deepEqual(user.body.data, {
    id: 1,
    username: 'admin',
    displayName: 'Admin',
    departmentId: null,
    isSuperAdmin: true,
    roles: ['admin'],
    permissions: ['*']
  })
  const routes = await call('/auth/routes', { token })
  assert.equal(routes.response.status, 200)
  assert.equal(routes.body.data[0].path, '/system')
  assert.equal(routes.body.data[0].children[0].component, 'system/user/index')
  assert.equal((await signIn('admin')).body.data.accessToken === token, false)
})

test('unknown, disabled, deleted and wrong-password accounts share one failure', async (t) => {
  const { sqlite, call } = fixture(t)
  for (const [username, state] of [
    ['missing', ''],
    ['viewer', ''],
    ['viewer', 'status=0'],
    ['viewer', "deleted_at='2026-01-01'"]
  ]) {
    if (state) sqlite.exec(`UPDATE sys_user SET ${state} WHERE id=2`)
    const result = await call('/auth/login', {
      method: 'POST',
      json: { username, password: state ? password : 'wrong' }
    })
    assert.equal(result.response.status, 401)
    assert.deepEqual(result.body, { code: 10001, message: '用户名或密码错误', data: null })
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 0)
})

test('forged, expired and logged-out tokens cannot authorize; logout is idempotent', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const token = (await signIn()).body.data.accessToken
  assert.equal((await call('/auth/user', { token: 'f'.repeat(64) })).response.status, 401)
  assert.equal((await call('/auth/user')).body.code, 10002)
  sqlite
    .prepare('UPDATE sys_auth_session SET created_at=?, expires_at=?')
    .run(Date.now() - 2000, Date.now() - 1000)
  assert.equal((await call('/auth/user', { token })).body.code, 10002)
  const active = (await signIn()).body.data.accessToken
  for (let index = 0; index < 2; index++)
    assert.equal(
      (await call('/auth/logout', { method: 'POST', token: active })).response.status,
      200
    )
  assert.equal((await call('/auth/routes', { token: active })).response.status, 401)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 0)
})

test('existing sessions immediately reject disabled/deleted users or changed passwords', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const token = (await signIn()).body.data.accessToken
  for (const update of ['status=0', "deleted_at='2026-01-01'", "password_hash='changed'"]) {
    sqlite
      .prepare('UPDATE sys_user SET status=1, deleted_at=NULL, password_hash=? WHERE id=2')
      .run(passwordHash)
    sqlite.exec(`UPDATE sys_user SET ${update} WHERE id=2`)
    assert.equal((await call('/auth/user', { token })).response.status, 401)
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 0)
})

test('readonly grants only its page/buttons, role changes are fresh, admin role is not superadmin', async (t) => {
  const { sqlite, call, signIn, db } = fixture(t)
  const token = (await signIn()).body.data.accessToken
  let user = (await call('/auth/user', { token })).body.data
  assert.deepEqual(user.permissions, ['system:user:list'])
  let route = (await call('/auth/routes', { token })).body.data[0]
  assert.deepEqual(
    route.children.map((node) => node.name),
    ['SystemUser']
  )
  assert.deepEqual(route.children[0].permissions, [
    { name: '查看', permission: 'system:user:list' }
  ])
  const access = await authorization(db, sqlite.prepare('SELECT * FROM sys_user WHERE id=2').get())
  assert.throws(
    () => requirePermission(access, 'system:user:delete'),
    (error) => error.status === 403
  )
  requirePermission(access, 'system:user:list')
  sqlite.exec('INSERT INTO sys_user_role(user_id, role_id) VALUES (2, 2)')
  user = (await call('/auth/user', { token })).body.data
  assert.deepEqual(new Set(user.roles), new Set(['editor', 'viewer']))
  assert.ok(user.permissions.includes('system:user:create'))
  sqlite.exec('UPDATE sys_role SET status=0 WHERE id=2')
  assert.deepEqual((await call('/auth/user', { token })).body.data.permissions, [
    'system:user:list'
  ])
  sqlite.exec("UPDATE sys_role SET deleted_at='2026-01-01' WHERE id=3")
  assert.deepEqual((await call('/auth/routes', { token })).body.data, [])
  sqlite.exec('INSERT INTO sys_user_role(user_id, role_id) VALUES (2, 1)')
  user = (await call('/auth/user', { token })).body.data
  assert.equal(user.isSuperAdmin, false)
  assert.equal(user.permissions.includes('*'), false)
})

test('hidden menus keep access; disabled/deleted ancestors and corrupt cycles remove the subtree', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const token = (await signIn()).body.data.accessToken
  sqlite.exec('UPDATE sys_menu SET visible=0 WHERE id=10')
  assert.equal((await call('/auth/routes', { token })).body.data[0].children[0].hidden, true)
  assert.deepEqual((await call('/auth/user', { token })).body.data.permissions, [
    'system:user:list'
  ])
  for (const update of ['status=0', "deleted_at='2026-01-01'", 'parent_id=10']) {
    sqlite.exec('UPDATE sys_menu SET status=1, deleted_at=NULL, parent_id=NULL WHERE id=1')
    sqlite.exec(`UPDATE sys_menu SET ${update} WHERE id=1`)
    assert.deepEqual((await call('/auth/routes', { token })).body.data, [])
    assert.deepEqual((await call('/auth/user', { token })).body.data.permissions, [])
  }
})

test('directory grants do not expand downwards; malformed route queries fail closed', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const token = (await signIn()).body.data.accessToken
  sqlite.exec(
    'DELETE FROM sys_role_menu WHERE role_id=3; INSERT INTO sys_role_menu(role_id, menu_id) VALUES (3, 1)'
  )
  assert.deepEqual((await call('/auth/routes', { token })).body.data, [])
  sqlite.exec('INSERT INTO sys_role_menu(role_id, menu_id) VALUES (3, 10)')
  sqlite
    .prepare('UPDATE sys_menu SET route_query=? WHERE id=10')
    .run(JSON.stringify({ tab: 'info', id: 2, active: true }))
  assert.deepEqual((await call('/auth/routes', { token })).body.data[0].children[0].routeQuery, {
    tab: 'info',
    id: 2,
    active: true
  })
  sqlite.exec("UPDATE sys_menu SET route_query='[]' WHERE id=10")
  t.mock.method(console, 'error', () => {})
  assert.equal((await call('/auth/routes', { token })).response.status, 503)
})

test('login rate limits persist in SQL, share case-insensitive buckets and reset after the window', async (t) => {
  const { call, sqlite } = fixture(t)
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  for (let index = 0; index < 5; index++) {
    const result = await call('/auth/login', {
      method: 'POST',
      json: { username: index % 2 ? 'VIEWER' : 'viewer', password: 'wrong' }
    })
    assert.equal(result.response.status, 401)
  }
  let result = await call('/auth/login', { method: 'POST', json: { username: 'viewer', password } })
  assert.equal(result.response.status, 429)
  assert.equal(result.response.headers.get('Retry-After'), '900')
  const buckets = sqlite.prepare('SELECT bucket FROM sys_auth_attempt').all()
  assert.equal(buckets.length, 2)
  assert.ok(buckets.every((row) => /^[a-f0-9]{64}$/.test(row.bucket)))
  now += 900001
  result = await call('/auth/login', { method: 'POST', json: { username: 'viewer', password } })
  assert.equal(result.response.status, 200)
})

test('IP-wide limits prevent rotating usernames from bypassing the login budget', async (t) => {
  const { call } = fixture(t)
  for (let index = 0; index < 30; index++)
    assert.equal(
      (
        await call('/auth/login', {
          method: 'POST',
          json: { username: `missing${index}`, password: 'wrong' }
        })
      ).response.status,
      401
    )
  assert.equal(
    (await call('/auth/login', { method: 'POST', json: { username: 'admin', password } })).response
      .status,
    429
  )
})

test('at most ten active sessions are kept per user', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const tokens = []
  for (let index = 0; index < 12; index++)
    tokens.push(
      (await signIn('viewer', { headers: { 'CF-Connecting-IP': `192.0.2.${index + 1}` } })).body
        .data.accessToken
    )
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 10)
  const statuses = await Promise.all(
    tokens.map(async (token) => (await call('/auth/user', { token })).response.status)
  )
  assert.equal(statuses.filter((status) => status === 200).length, 10)
})

test('CORS uses exact origins and sends headers on errors and preflight responses', async (t) => {
  const { call } = fixture(t)
  for (const origin of ['http://localhost:3000', 'https://admin.example.test']) {
    const preflight = await call('/api/auth/login', { method: 'OPTIONS', origin })
    assert.equal(preflight.response.status, 204)
    assert.equal(preflight.response.headers.get('Access-Control-Allow-Origin'), origin)
    assert.equal(preflight.response.headers.get('Access-Control-Allow-Credentials'), null)
    const denied = await call('/auth/user', { origin })
    assert.equal(denied.response.status, 401)
    assert.equal(denied.response.headers.get('Access-Control-Allow-Origin'), origin)
  }
  const denied = await call('/health', { origin: 'https://admin.example.test.evil.test' })
  assert.equal(denied.response.status, 403)
  assert.equal(denied.response.headers.get('Access-Control-Allow-Origin'), null)
})

test('malformed login requests, unsupported methods and oversized JSON are rejected', async (t) => {
  const { call } = fixture(t)
  assert.equal((await call('/auth/login')).response.status, 405)
  assert.equal((await call('/unknown')).response.status, 404)
  assert.equal((await call('/auth/login', { method: 'POST', body: 'bad' })).response.status, 415)
  for (const body of ['{', 'null', '[]', '{"username":1}', '{"username":"x","password":"p"}'])
    assert.equal(
      (
        await call('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        })
      ).response.status,
      400
    )
  assert.equal(
    (await call('/auth/login', { method: 'POST', json: { value: 'x'.repeat(9000) } })).response
      .status,
    413
  )
  assert.equal(
    (
      await call('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '9000' },
        body: '{}'
      })
    ).response.status,
    413
  )
})

test('missing secrets fail without creating sessions or leaking details', async (t) => {
  const { env, signIn, sqlite } = fixture(t)
  env.AUTH_PEPPER = ''
  t.mock.method(console, 'error', () => {})
  const result = await signIn()
  assert.equal(result.response.status, 503)
  assert.equal(JSON.stringify(result.body).includes('AUTH_PEPPER'), false)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 0)
})

test('password derivation uses fresh salts, pepper and strict stored hash formats', async () => {
  const first = await hashPassword(password, pepper)
  const second = await hashPassword(password, pepper)
  assert.notEqual(first, second)
  assert.equal(await verifyPassword(password, first, pepper), true)
  assert.equal(await verifyPassword('wrong', first, pepper), false)
  assert.equal(await verifyPassword(password, first, 'b2'.repeat(32)), false)
  assert.equal(await verifyPassword(password, 'npora-v1$999999999$bad$bad', pepper), false)
})

test('disable/password changes revoke sessions permanently, including after re-enabling', async (t) => {
  const { sqlite, call, signIn } = fixture(t)
  const old = (await signIn()).body.data.accessToken
  sqlite.exec('UPDATE sys_user SET status=0 WHERE id=2; UPDATE sys_user SET status=1 WHERE id=2')
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_auth_session').get().n, 0)
  assert.equal((await call('/auth/user', { token: old })).response.status, 401)
  const current = (await signIn()).body.data.accessToken
  sqlite.exec("UPDATE sys_user SET password_hash='changed' WHERE id=2")
  sqlite.prepare('UPDATE sys_user SET password_hash=? WHERE id=2').run(passwordHash)
  assert.equal((await call('/auth/user', { token: current })).response.status, 401)
})
