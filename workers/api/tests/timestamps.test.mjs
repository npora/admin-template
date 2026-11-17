import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { service } from './helpers/service.mjs'
import { digest } from '../src/security/crypto.mjs'
import { authenticate } from '../src/modules/auth.mjs'

const migration = readFileSync(
  new URL('../migrations/0008_millisecond_timestamps.sql', import.meta.url),
  'utf8'
)
function legacyDatabase(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec('PRAGMA foreign_keys=ON')
  for (const file of readdirSync(new URL('../migrations/', import.meta.url))
    .filter((name) => /^000[1-7]_.*\.sql$/.test(name))
    .sort()) {
    let source = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8')
    source = source
      .replaceAll(
        "INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))",
        "TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
      )
      .replace(/(last_login_at|deleted_at) INTEGER/g, '$1 TEXT')
    sqlite.exec(source)
  }
  return sqlite
}
function apply(sqlite) {
  sqlite.exec('BEGIN')
  try {
    sqlite.exec(migration)
    sqlite.exec('COMMIT')
  } catch (error) {
    sqlite.exec('ROLLBACK')
    throw error
  }
}

test('legacy ISO timestamps migrate exactly while IDs, relations, sessions, TOTP, indexes and sequences survive', async (t) => {
  const db = legacyDatabase(t)
  const date = '2024-02-29T12:34:56.789Z'
  const timestamp = Date.parse(date)
  db.prepare(
    "INSERT INTO sys_user(id,username,password_hash,display_name,created_at,updated_at,last_login_at) VALUES(5001,'custom_user','hash','Custom',?,?,?)"
  ).run(date, date, date)
  db.exec('INSERT INTO sys_user_role(user_id,role_id) VALUES(5001,3)')
  db.exec(
    "INSERT INTO sys_menu(id,parent_id,type,title,name,path,component) VALUES(9001,1,2,'Custom','CustomPage','custom','system/user/index'); INSERT INTO sys_role_menu(role_id,menu_id) VALUES(3,9001)"
  )
  db.exec(
    "INSERT INTO sys_user(id,username,password_hash,display_name) VALUES(9009,'removed_user','hash','Removed'); DELETE FROM sys_user WHERE id=9009"
  )
  db.exec(
    "INSERT INTO sys_role(id,code,name,deleted_at) VALUES(5001,'deleted_role','Deleted','1970-01-01T00:00:00.000Z')"
  )
  const tokenHash = await digest('a'.repeat(64))
  db.prepare('INSERT INTO sys_auth_session VALUES(?,?,?,?,?)').run(
    tokenHash,
    5001,
    await digest('hash'),
    Date.now(),
    Date.now() + 3600000
  )
  db.prepare(
    'INSERT INTO sys_user_totp(user_id,secret_encrypted,enabled,credential_fingerprint,last_used_step) VALUES(5001,?,1,?,123)'
  ).run('encrypted-record', await digest('hash'))
  const objects = db
    .prepare("SELECT name FROM sqlite_schema WHERE type IN ('index','trigger') ORDER BY name")
    .all()
  apply(db)
  assert.equal(
    db
      .prepare(
        `SELECT count(*) n FROM sqlite_schema s, pragma_table_info(s.name) c
      WHERE s.type='table' AND s.name NOT LIKE '_ms_%'
      AND c.name IN ('created_at','updated_at','deleted_at','last_login_at','expires_at','pending_expires_at')
      AND c.type <> 'INTEGER'`
      )
      .get().n,
    0,
    'every absolute timestamp column uses integer storage'
  )
  const row = db.prepare('SELECT * FROM sys_user WHERE id=5001').get()
  assert.equal(row.created_at, timestamp)
  assert.equal(row.updated_at, timestamp)
  assert.equal(row.last_login_at, timestamp)
  assert.equal(row.deleted_at, null)
  assert.equal(db.prepare('SELECT deleted_at FROM sys_role WHERE id=5001').get().deleted_at, 0)
  assert.equal(db.prepare('SELECT count(*) n FROM sys_user_role WHERE user_id=5001').get().n, 1)
  assert.equal(db.prepare('SELECT count(*) n FROM sys_role_menu WHERE menu_id=9001').get().n, 1)
  assert.equal(
    db.prepare('SELECT last_used_step FROM sys_user_totp WHERE user_id=5001').get().last_used_step,
    123
  )
  assert.equal(db.prepare('SELECT count(*) n FROM sys_auth_session WHERE user_id=5001').get().n, 1)
  assert.deepEqual(
    db
      .prepare("SELECT name FROM sqlite_schema WHERE type IN ('index','trigger') ORDER BY name")
      .all(),
    objects
  )
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  assert.equal(
    db.prepare("SELECT count(*) n FROM sqlite_schema WHERE name LIKE '_ms_%'").get().n,
    0
  )
  db.exec(
    "INSERT INTO sys_user(username,password_hash,display_name) VALUES('next_user','hash','Next')"
  )
  const next = db
    .prepare("SELECT id,created_at,updated_at FROM sys_user WHERE username='next_user'")
    .get()
  assert.equal(next.id, 9010)
  assert.ok(Math.abs(next.created_at - Date.now()) < 2000)
  assert.equal(typeof next.updated_at, 'number')
  db.exec('UPDATE sys_user SET status=0 WHERE id=5001')
  assert.equal(
    db.prepare('SELECT count(*) n FROM sys_auth_session WHERE user_id=5001').get().n,
    0,
    'revocation trigger remains active'
  )
})

test('millisecond migration rejects unsupported custom schema or invalid dates without losing original data', (t) => {
  const db = legacyDatabase(t)
  db.exec(
    "INSERT INTO sys_user(id,username,password_hash,display_name) VALUES(5001,'custom_user','hash','Original')"
  )
  db.exec('ALTER TABLE sys_user ADD COLUMN custom_note TEXT')
  assert.throws(() => apply(db), /CHECK constraint failed/)
  assert.equal(
    db.prepare('SELECT display_name FROM sys_user WHERE id=5001').get().display_name,
    'Original'
  )
  assert.equal(
    db.prepare("SELECT type FROM pragma_table_info('sys_user') WHERE name='created_at'").get().type,
    'TEXT'
  )
  db.exec('ALTER TABLE sys_user DROP COLUMN custom_note')
  db.exec("UPDATE sys_user SET created_at='invalid-date' WHERE id=5001")
  assert.throws(() => apply(db), /CHECK constraint failed/)
  assert.equal(
    db.prepare('SELECT created_at FROM sys_user WHERE id=5001').get().created_at,
    'invalid-date'
  )
})

test('all business DTO timestamps and login writes are milliseconds; epoch-zero deletion is never live', async (t) => {
  const { call, sqlite, db, viewer } = await service(t)
  for (const path of [
    '/system/users',
    '/system/roles',
    '/system/departments',
    '/system/menus',
    '/system/dict-types'
  ]) {
    const response = await call(path)
    assert.equal(response.status, 200)
    const list = Array.isArray(response.body.data) ? response.body.data : response.body.data.list
    for (const row of list) {
      assert.equal(typeof row.createdAt, 'number')
      assert.equal(typeof row.updatedAt, 'number')
    }
  }
  assert.equal(
    typeof sqlite.prepare('SELECT last_login_at FROM sys_user WHERE id=1').get().last_login_at,
    'number'
  )
  sqlite.exec('UPDATE sys_role SET deleted_at=0 WHERE id=3')
  const auth = await call('/auth/user', { token: viewer })
  assert.deepEqual(auth.body.data.roles, [])
  assert.deepEqual(auth.body.data.permissions, [])
  // Soft deletion at the Unix epoch remains a deletion in both SQL and JS checks.
  sqlite.exec('UPDATE sys_user SET deleted_at=0 WHERE id=2')
  await assert.rejects(
    authenticate(
      new Request('https://test/', { headers: { Authorization: `Bearer ${viewer}` } }),
      db
    ),
    (error) => error.status === 401
  )
})
