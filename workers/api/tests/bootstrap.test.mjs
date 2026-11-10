import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBootstrap } from '../scripts/bootstrap.mjs'
import { database } from './helpers/database.mjs'
import { verifyPassword } from '../src/security/crypto.mjs'

test('bootstrap produces private random credentials and SQL without plaintext secrets; refuses overwrite', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'npora-worker-bootstrap-'))
  const directory = join(parent, '.local')
  const storage = database()
  try {
    await createBootstrap(directory)
    const sql = await readFile(join(directory, 'bootstrap.sql'), 'utf8')
    const credentials = JSON.parse(await readFile(join(directory, 'credentials.json'), 'utf8'))
    assert.equal(sql.includes(credentials.AUTH_PEPPER), false)
    storage.sqlite.exec(sql)
    for (const [username, password] of Object.entries(credentials.accounts)) {
      assert.equal(sql.includes(password), false)
      assert.ok(password.length >= 12)
      const user = storage.sqlite.prepare('SELECT * FROM sys_user WHERE username=?').get(username)
      assert.equal(
        await verifyPassword(password, user.password_hash, credentials.AUTH_PEPPER),
        true
      )
      assert.equal(user.is_super_admin, username === 'admin' ? 1 : 0)
    }
    await assert.rejects(createBootstrap(directory), { code: 'EEXIST' })
    assert.deepEqual(
      JSON.parse(await readFile(join(directory, 'credentials.json'), 'utf8')),
      credentials
    )
    if (process.platform !== 'win32') {
      assert.equal((await stat(directory)).mode & 0o777, 0o700)
      assert.equal((await stat(join(directory, 'credentials.json'))).mode & 0o777, 0o600)
    }
    assert.throws(() =>
      storage.sqlite.exec(
        "INSERT INTO sys_user(username,password_hash,display_name) VALUES('ADMIN','bad','Duplicate')"
      )
    )
    assert.throws(() =>
      storage.sqlite.exec('INSERT INTO sys_user_role(user_id,role_id) VALUES(999,3)')
    )
    assert.throws(() => storage.sqlite.exec('UPDATE sys_user SET status=2'))
    assert.throws(() =>
      storage.sqlite.exec(
        "INSERT INTO sys_menu(type,title,path,component) VALUES(3,'Bad','/button','index')"
      )
    )
    storage.sqlite.exec("UPDATE sys_user SET deleted_at='2026-01-01' WHERE username='viewer'")
    assert.throws(() =>
      storage.sqlite.exec(
        "INSERT INTO sys_user(username,password_hash,display_name) VALUES('viewer','bad','Reuse')"
      )
    )
  } finally {
    storage.close()
    await rm(parent, { recursive: true, force: true })
  }
})
