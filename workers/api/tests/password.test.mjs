import assert from 'node:assert/strict'
import { test } from 'node:test'
import { digest } from '../src/security/crypto.mjs'
import { service, password } from './helpers/service.mjs'
import { createTotpSecret, encryptTotp, totpCode } from '../src/security/totp.mjs'

const newPassword = 'Updated-test-password-2026'
const now = Date.UTC(2026, 8, 1, 0, 0, 15)
const step = Math.floor(now / 30000)

async function bindViewer(env, sqlite) {
  const secret = createTotpSecret()
  env.AUTH_TOTP_KEY = 'b2'.repeat(32)
  const encrypted = await encryptTotp(secret, 2, env)
  sqlite
    .prepare(
      'INSERT INTO sys_user_totp(user_id, secret_encrypted, enabled, credential_fingerprint) VALUES (2, ?, 1, ?)'
    )
    .run(encrypted, 'test')
  return secret
}

test('logged-in users change their own password and invalidate their old sessions', async (t) => {
  const { call, login, viewer, editor, env, sqlite } = await service(t)
  env.AUTH_PASSWORD_ITERATIONS = '600000'
  const change = (token, currentPassword) =>
    call('/auth/password/change', {
      method: 'POST',
      token,
      json: { currentPassword, newPassword }
    })
  assert.equal((await change(null, password)).status, 401)
  assert.equal((await change(viewer, 'Wrong-password')).status, 400)
  const secondToken = (await login('viewer')).body.data.accessToken
  assert.equal((await change(viewer, password)).status, 200)
  assert.match(
    sqlite.prepare('SELECT password_hash FROM sys_user WHERE id=2').get().password_hash,
    /^npora-v1\$600000\$/
  )
  for (const token of [viewer, secondToken])
    assert.equal((await call('/auth/user', { token })).status, 401)
  assert.equal((await call('/auth/user', { token: editor })).status, 200)
  assert.equal((await login('viewer', password)).status, 401)
  assert.equal((await login('viewer', newPassword)).status, 200)
})

test('a bound account needs the current password and a fresh dynamic code to change password', async (t) => {
  t.mock.method(Date, 'now', () => now)
  const { call, env, sqlite, viewer } = await service(t)
  const secret = await bindViewer(env, sqlite)
  const code = await totpCode(secret, step)
  const change = (currentPassword, totpCode) =>
    call('/auth/password/change', {
      method: 'POST',
      token: viewer,
      json: { currentPassword, newPassword, totpCode }
    })
  assert.equal((await change(password)).body.code, 10003)
  assert.equal((await change('Wrong-password', code)).status, 400)
  assert.equal((await change(password, code)).status, 200)
  assert.equal((await call('/auth/user', { token: viewer })).status, 401)
  assert.equal(
    sqlite.prepare('SELECT last_used_step FROM sys_user_totp WHERE user_id=2').get().last_used_step,
    step
  )
})

test('password recovery hides account status and atomically consumes the dynamic code', async (t) => {
  t.mock.method(Date, 'now', () => now)
  const { call, env, sqlite, viewer, editor } = await service(t)
  const secret = await bindViewer(env, sqlite)
  const code = await totpCode(secret, step)
  const reset = (username, totpCode) =>
    call('/auth/password/reset', {
      method: 'POST',
      token: null,
      json: { username, totpCode, newPassword }
    })
  const unbound = await reset('editor', code)
  const unknown = await reset('unknown_user', code)
  assert.equal(unbound.status, 400)
  assert.deepEqual(unknown.body, unbound.body)
  const contenders = await Promise.all([reset('viewer', code), reset('VIEWER', code)])
  assert.deepEqual(contenders.map(({ status }) => status).sort(), [200, 400])
  assert.deepEqual((await reset('viewer', code)).body, unknown.body)
  assert.equal((await call('/auth/user', { token: viewer })).status, 401)
  assert.equal((await call('/auth/user', { token: editor })).status, 200)
  async function signIn(totpCode) {
    return call('/auth/login', {
      method: 'POST',
      token: null,
      json: { username: 'viewer', password: newPassword, totpCode }
    })
  }
  assert.equal((await signIn(code)).body.code, 10003)
  assert.equal((await signIn(await totpCode(secret, step + 1))).status, 200)
})

test('password recovery throttles a target account across different IP addresses', async (t) => {
  const { call, env, login } = await service(t)
  env.AUTH_TOTP_KEY = 'b2'.repeat(32)
  for (let i = 1; i <= 11; i++) {
    const response = await call('/auth/password/reset', {
      method: 'POST',
      token: null,
      headers: { 'CF-Connecting-IP': `192.0.2.${i}` },
      json: { username: i % 2 ? 'viewer' : 'VIEWER', totpCode: '000000', newPassword }
    })
    assert.equal(response.status, i <= 10 ? 400 : 429)
  }
  assert.equal((await login('viewer')).status, 200)
})

test('in-flight password change cannot write after the authenticating session is revoked', async (t) => {
  const { call, db, env, sqlite, viewer } = await service(t)
  const tokenHash = await digest(viewer)
  const lookup = sqlite.prepare('SELECT password_hash FROM sys_user WHERE id=2')
  const before = lookup.get().password_hash
  let revoked = false
  env.DB = {
    ...db,
    prepare(sql) {
      if (sql.startsWith('UPDATE sys_user SET password_hash')) {
        revoked =
          sqlite.prepare('DELETE FROM sys_auth_session WHERE token_hash=?').run(tokenHash)
            .changes === 1
      }
      return db.prepare(sql)
    }
  }
  const result = await call('/auth/password/change', {
    method: 'POST',
    token: viewer,
    json: { currentPassword: password, newPassword }
  })
  assert.equal(revoked, true)
  assert.equal(result.status, 401)
  assert.equal(lookup.get().password_hash, before)
})

test('a configured public demo account can sign in but its credentials cannot be changed', async (t) => {
  const { call, env, login, sqlite } = await service(t)
  env.AUTH_DEMO_PROTECTED_USERNAME = ' Admin '
  env.AUTH_TOTP_ENABLED = 'true'
  env.AUTH_TOTP_KEY = 'b2'.repeat(32)
  const original = sqlite.prepare('SELECT password_hash FROM sys_user WHERE id=1').get()
  for (const [path, json] of [
    ['/auth/password/change', { currentPassword: password, newPassword }],
    ['/system/users/1/password', { currentPassword: password, newPassword }],
    ['/auth/totp/setup', { password }]
  ]) {
    assert.equal((await call(path, { method: 'POST', json })).status, 403)
  }
  assert.deepEqual(sqlite.prepare('SELECT password_hash FROM sys_user WHERE id=1').get(), original)
  assert.equal((await login('admin')).status, 200)
})
