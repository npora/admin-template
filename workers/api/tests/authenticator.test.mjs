import assert from 'node:assert/strict'
import { test } from 'node:test'
import { service, password } from './helpers/service.mjs'
import { verifyPassword } from '../src/security/crypto.mjs'
import { AUTH_DEFAULTS, resolveAuthConfig } from '../src/config/auth.mjs'
import {
  createTotpSecret,
  totpCode,
  verifyTotp,
  encryptTotp,
  decryptTotp
} from '../src/security/totp.mjs'

test('shared auth configuration defaults off and honors explicit environment overrides', () => {
  assert.equal(resolveAuthConfig().authenticatorEnabled, false)
  assert.equal(resolveAuthConfig({ AUTH_TOTP_ENABLED: 'true' }).authenticatorEnabled, true)
  for (const value of ['false', '', true, 'TRUE', '1', null])
    assert.equal(resolveAuthConfig({ AUTH_TOTP_ENABLED: value }).authenticatorEnabled, false)
  assert.equal(
    resolveAuthConfig({ AUTH_TOTP_ISSUER: '  Test admin  ' }).authenticatorIssuer,
    'Test admin'
  )
  assert.equal(
    resolveAuthConfig({ AUTH_TOTP_ISSUER: '  ' }).authenticatorIssuer,
    AUTH_DEFAULTS.authenticatorIssuer
  )
  assert.equal(
    resolveAuthConfig({ AUTH_TOTP_ISSUER: 'x'.repeat(100) }).authenticatorIssuer.length,
    80
  )
  assert.equal(resolveAuthConfig().sessionTtlMs, 3600000)
  assert.equal(resolveAuthConfig().rememberedSessionTtlMs, 7 * 86400000)
})

test('TOTP matches RFC 6238 SHA1 vectors and rejects reused or malformed codes', async () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  for (const [seconds, expected] of [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130']
  ])
    assert.equal(await totpCode(secret, Math.floor(seconds / 30), 8), expected)
  assert.equal(await verifyTotp(secret, '287082', 59000), 1)
  assert.equal(await verifyTotp(secret, '287082', 59000, 1), null)
  assert.equal(await verifyTotp(secret, '287082', 180000), null)
  for (const code of [123456, '12345', '1234567', 'abcdef', null])
    assert.equal(await verifyTotp(secret, code, 59000), null)
})
test('TOTP secrets use random keys and authenticated encryption bound to the account', async () => {
  const secret = createTotpSecret()
  assert.match(secret, /^[A-Z2-7]{32}$/)
  assert.notEqual(secret, createTotpSecret())
  const env = { AUTH_TOTP_KEY: 'a1'.repeat(32) }
  const encrypted = await encryptTotp(secret, 1, env)
  assert.notEqual(encrypted, await encryptTotp(secret, 1, env))
  assert.equal(await decryptTotp(encrypted, 1, env), secret)
  await assert.rejects(decryptTotp(encrypted, 2, env))
  await assert.rejects(decryptTotp(encrypted, 1, { AUTH_TOTP_KEY: 'b1'.repeat(32) }))
  await assert.rejects(decryptTotp(encrypted, 1, {}))
})
test('authenticator defaults off; enrollment requires password and a configured server key', async (t) => {
  const { env, call, admin, sqlite } = await service(t)
  assert.deepEqual((await call('/auth/totp')).body.data, { available: false, enabled: false })
  assert.equal((await call('/auth/totp/setup', { method: 'POST', json: { password } })).status, 404)
  env.AUTH_TOTP_ENABLED = 'true'
  assert.equal((await call('/auth/totp/setup', { method: 'POST', json: { password } })).status, 503)
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  assert.equal(
    (await call('/auth/totp/setup', { method: 'POST', token: null, json: { password } })).status,
    401
  )
  assert.equal(
    (await call('/auth/totp/setup', { method: 'POST', token: admin, json: { password: 'wrong' } }))
      .status,
    400
  )
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sys_user_totp').get().n, 0)
})
test('enrollment, replay protection, disabled feature enforcement and unlinking revoke sessions', async (t) => {
  const { env, call, admin, sqlite } = await service(t)
  let now = 1800000000000
  t.mock.method(Date, 'now', () => now)
  // Existing fixture tokens were created using the real clock; keep them valid in this test.
  sqlite.prepare('UPDATE sys_auth_session SET expires_at = ?').run(now + 3600000)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  env.AUTH_TOTP_ISSUER = 'Test admin'
  const setup = await call('/auth/totp/setup', { method: 'POST', json: { password } })
  assert.equal(setup.status, 200)
  const secret = setup.body.data.secret
  assert.match(setup.body.data.uri, /^otpauth:\/\/totp\//)
  assert.equal(new URL(setup.body.data.uri).searchParams.get('issuer'), 'Test admin')
  assert.equal(sqlite.prepare('SELECT enabled FROM sys_user_totp').get().enabled, 0)
  assert.ok(
    !sqlite
      .prepare('SELECT secret_encrypted FROM sys_user_totp')
      .get()
      .secret_encrypted.includes(secret)
  )
  const code = await totpCode(secret, Math.floor(now / 30000))
  assert.equal(
    (await call('/auth/totp/enable', { method: 'POST', json: { password, code } })).status,
    200
  )
  assert.equal((await call('/auth/user', { token: admin })).status, 401)
  now += 30000
  const signIn = (totpCode, ip) =>
    call('/auth/login', {
      method: 'POST',
      token: null,
      json: { username: 'admin', password, totpCode, rememberMe: true },
      headers: { 'CF-Connecting-IP': ip }
    })
  assert.equal((await signIn(undefined, '192.0.2.20')).body.code, 10003)
  const enabledCode = await totpCode(secret, Math.floor(now / 30000))
  const validCodes = await Promise.all(
    [-1, 0, 1].map((offset) => totpCode(secret, Math.floor(now / 30000) + offset))
  )
  let wrongCode = '000000'
  while (validCodes.includes(wrongCode)) wrongCode = String(Number(wrongCode) + 1).padStart(6, '0')
  assert.equal((await signIn(wrongCode, '192.0.2.21')).body.code, 10003)
  const enabledLogin = await signIn(enabledCode, '192.0.2.22')
  assert.equal(enabledLogin.status, 200)
  assert.equal(
    (await call('/auth/user', { token: enabledLogin.body.data.accessToken })).status,
    200
  )
  now += 30000
  env.AUTH_TOTP_ENABLED = 'false'
  const loginCode = await totpCode(secret, Math.floor(now / 30000))
  assert.equal((await signIn(undefined, '192.0.2.10')).body.code, 10003)
  const results = await Promise.all([
    signIn(loginCode, '192.0.2.11'),
    signIn(loginCode, '192.0.2.12')
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400])
  const token = results.find((r) => r.status === 200).body.data.accessToken
  assert.deepEqual((await call('/auth/totp', { token })).body.data, {
    available: false,
    enabled: true
  })
  assert.equal(
    sqlite
      .prepare('SELECT expires_at - created_at ttl FROM sys_auth_session WHERE user_id = 1')
      .get().ttl,
    7 * 86400000
  )
  now += 30000
  const disable = await call('/auth/totp/disable', {
    method: 'POST',
    token,
    json: { password, code: await totpCode(secret, Math.floor(now / 30000)) }
  })
  assert.equal(disable.status, 200)
  assert.equal((await call('/auth/user', { token })).status, 401)
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sys_user_totp').get().n, 0)
  assert.deepEqual(
    sqlite
      .prepare(
        "SELECT action, actor_id, target_id FROM sys_audit_log WHERE result='success' ORDER BY id"
      )
      .all()
      .map((row) => ({ ...row })),
    [
      { action: 'totp_enable', actor_id: 1, target_id: 1 },
      { action: 'totp_disable', actor_id: 1, target_id: 1 }
    ]
  )
})
test('pending enrollment expires, and default versus remembered sessions have bounded lifetimes', async (t) => {
  const { env, call, sqlite } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  const result = await call('/auth/totp/setup', { method: 'POST', json: { password } })
  sqlite.exec('UPDATE sys_user_totp SET pending_expires_at = 1')
  const code = await totpCode(result.body.data.secret, Math.floor(Date.now() / 30000))
  assert.equal(
    (await call('/auth/totp/enable', { method: 'POST', json: { password, code } })).status,
    400
  )
  const login = await call('/auth/login', {
    method: 'POST',
    token: null,
    json: { username: 'admin', password }
  })
  assert.equal(login.status, 200)
  assert.ok(login.body.data.expiresAt > Date.now())
  assert.equal(
    (
      await call('/auth/login', {
        method: 'POST',
        token: null,
        json: { username: 'admin', password, rememberMe: 'yes' }
      })
    ).status,
    400
  )
})

test('administrator password reset requires fresh credentials, denies ordinary roles and revokes target sessions', async (t) => {
  const { call, login, viewer, editor, env, sqlite } = await service(t)
  const newPassword = 'Reset6'
  for (const token of [viewer, editor])
    assert.equal(
      (
        await call('/system/users/2/password', {
          method: 'POST',
          token,
          json: { currentPassword: password, newPassword }
        })
      ).status,
      403
    )
  assert.equal(
    (
      await call('/system/users/2/password', {
        method: 'POST',
        json: { currentPassword: 'wrong', newPassword }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await call('/system/users/2/password', {
        method: 'POST',
        json: { currentPassword: password, newPassword: 'short' }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await call('/system/users/2/password', {
        method: 'POST',
        json: { currentPassword: password, newPassword }
      })
    ).status,
    200
  )
  assert.equal((await call('/auth/user', { token: viewer })).status, 401)
  const stored = sqlite.prepare('SELECT password_hash FROM sys_user WHERE id=2').get().password_hash
  assert.equal(await verifyPassword(newPassword, stored, env.AUTH_PEPPER), true)
  assert.equal(await verifyPassword(password, stored, env.AUTH_PEPPER), false)
  assert.equal((await login('viewer', newPassword)).status, 200)
  assert.equal((await call('/system/roles/2/password', { method: 'POST', json: {} })).status, 404)
})

test('super administrator binds a target authenticator with own password; only target sessions are revoked', async (t) => {
  const { env, call, admin, sqlite } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  const { hashPassword } = await import('../src/security/crypto.mjs')
  const targetPassword = 'Different-target-password-2026'
  sqlite
    .prepare('UPDATE sys_user SET password_hash=? WHERE id=2')
    .run(await hashPassword(targetPassword, env.AUTH_PEPPER))
  const login = (totpCode) =>
    call('/auth/login', {
      method: 'POST',
      token: null,
      json: { username: 'viewer', password: targetPassword, totpCode }
    })
  const firstToken = (await login()).body.data.accessToken
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  const path = '/system/users/2/totp'
  assert.deepEqual((await call(path)).body.data, { available: true, enabled: false })
  assert.equal(
    (await call(path + '/setup', { method: 'POST', json: { password: targetPassword } })).status,
    400
  )
  const setup = await call(path + '/setup', { method: 'POST', json: { password } })
  assert.equal(setup.status, 200)
  assert.match(decodeURIComponent(setup.body.data.uri), /Npora Admin:viewer/)
  const secret = setup.body.data.secret
  assert.deepEqual(
    {
      ...sqlite
        .prepare(
          'SELECT enabled,pending_expires_at,last_used_step FROM sys_user_totp WHERE user_id=2'
        )
        .get()
    },
    { enabled: 1, pending_expires_at: null, last_used_step: -1 }
  )
  assert.equal((await call(path + '/setup', { method: 'POST', json: { password } })).status, 409)
  assert.equal((await call('/auth/user', { token: firstToken })).status, 401)
  assert.equal((await call('/auth/user', { token: admin })).status, 200)
  const list = await call('/system/users?keyword=viewer')
  assert.equal(list.body.data.list[0].authenticatorEnabled, true)
  assert.ok(!JSON.stringify(list.body).includes(secret))
  assert.equal((await login()).body.code, 10003)
  const signed = await login(await totpCode(secret, Math.floor(now / 30000)))
  assert.equal(signed.status, 200)
  now += 30000
  assert.equal(
    (
      await call(path + '/disable', {
        method: 'POST',
        json: { password, code: await totpCode(secret, Math.floor(now / 30000)) }
      })
    ).status,
    200
  )
  assert.equal((await call('/auth/user', { token: signed.body.data.accessToken })).status, 401)
  assert.equal((await call('/auth/user', { token: admin })).status, 200)
  assert.equal(
    (await call('/system/users?keyword=viewer')).body.data.list[0].authenticatorEnabled,
    false
  )
})

test('delegated authenticator endpoints deny ordinary roles, other super administrators and invalid targets', async (t) => {
  const { env, call, viewer, editor, sqlite } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  for (const token of [null, viewer, editor]) {
    const expected = token === null ? 401 : 403
    assert.equal((await call('/system/users/2/totp', { token })).status, expected)
    for (const operation of ['setup', 'disable'])
      assert.equal(
        (
          await call('/system/users/2/totp/' + operation, {
            method: 'POST',
            token,
            json: { password, code: '123456' }
          })
        ).status,
        expected
      )
  }
  assert.equal((await call('/system/users/2/totp/setup')).status, 405)
  assert.equal((await call('/system/users/0/totp')).status, 404)
  assert.equal((await call('/system/users/9007199254740992/totp')).status, 404)
  assert.equal((await call('/system/users/999/totp')).status, 404)
  sqlite.exec('UPDATE sys_user SET is_super_admin=1 WHERE id=2')
  assert.equal((await call('/system/users/2/totp')).status, 403)
  assert.equal(
    (await call('/system/users/2/totp/setup', { method: 'POST', json: { password } })).status,
    403
  )
  sqlite.exec('UPDATE sys_user SET is_super_admin=0,status=0 WHERE id=2')
  assert.equal((await call('/system/users/2/totp')).status, 400)
  sqlite.exec('UPDATE sys_user SET deleted_at=0 WHERE id=2')
  assert.equal((await call('/system/users/2/totp')).status, 404)
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sys_user_totp').get().n, 0)
})

test('delegated setup cannot commit after the administrator loses super-admin access', async (t) => {
  const { env, call, sqlite } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  const prepare = env.DB.prepare.bind(env.DB)
  let revoked = false
  t.mock.method(env.DB, 'prepare', (sql) => {
    if (!revoked && sql.includes('INSERT INTO sys_user_totp')) {
      revoked = true
      sqlite.exec('UPDATE sys_user SET is_super_admin=0 WHERE id=1')
    }
    return prepare(sql)
  })
  const response = await call('/system/users/2/totp/setup', { method: 'POST', json: { password } })
  assert.equal(response.status, 409)
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sys_user_totp').get().n, 0)
})

test('administrator creation rolls back the binding if target session revocation fails', async (t) => {
  const { env, call, sqlite, viewer, admin } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  const prepare = env.DB.prepare.bind(env.DB)
  t.mock.method(env.DB, 'prepare', (sql) => {
    const statement = prepare(sql)
    if (sql.startsWith('DELETE FROM sys_auth_session WHERE user_id=?1 AND EXISTS'))
      statement.execute = () => {
        throw new Error('Simulated session cleanup failure')
      }
    return statement
  })
  assert.equal(
    (await call('/system/users/2/totp/setup', { method: 'POST', json: { password } })).status,
    503
  )
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sys_user_totp').get().n, 0)
  assert.equal((await call('/auth/user', { token: viewer })).status, 200)
  assert.equal((await call('/auth/user', { token: admin })).status, 200)
})

test('a user can replace an administrator-created binding through their own profile', async (t) => {
  const { env, call, admin, sqlite } = await service(t)
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b1'.repeat(32)
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  const created = await call('/system/users/2/totp/setup', { method: 'POST', json: { password } })
  assert.equal(created.status, 200)
  const oldSecret = created.body.data.secret
  const signIn = (code) =>
    call('/auth/login', {
      method: 'POST',
      token: null,
      json: { username: 'viewer', password, totpCode: code }
    })
  const signed = await signIn(await totpCode(oldSecret, Math.floor(now / 30000)))
  assert.equal(signed.status, 200)
  now += 30000
  assert.equal(
    (
      await call('/auth/totp/disable', {
        method: 'POST',
        token: signed.body.data.accessToken,
        json: { password, code: await totpCode(oldSecret, Math.floor(now / 30000)) }
      })
    ).status,
    200
  )
  const unbound = await signIn()
  assert.equal(unbound.status, 200)
  const token = unbound.body.data.accessToken
  const setup = await call('/auth/totp/setup', { method: 'POST', token, json: { password } })
  assert.equal(setup.status, 200)
  const newSecret = setup.body.data.secret
  assert.notEqual(newSecret, oldSecret)
  assert.equal(sqlite.prepare('SELECT enabled FROM sys_user_totp WHERE user_id=2').get().enabled, 0)
  assert.equal(
    (
      await call('/auth/totp/enable', {
        method: 'POST',
        token,
        json: { password, code: await totpCode(newSecret, Math.floor(now / 30000)) }
      })
    ).status,
    200
  )
  assert.equal((await call('/auth/user', { token })).status, 401)
  now += 30000
  assert.equal((await signIn(await totpCode(newSecret, Math.floor(now / 30000)))).status, 200)
  assert.equal((await call('/auth/user', { token: admin })).status, 200)
})
