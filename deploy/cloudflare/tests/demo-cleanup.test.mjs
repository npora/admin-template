import assert from 'node:assert/strict'
import { test } from 'node:test'
import { database } from '../../../workers/api/tests/helpers/database.mjs'
import worker from '../demo-cleanup.mjs'

const schedule = { cron: '0 16 * * *' }
const tables = {
  users: 'sys_user',
  departments: 'sys_department',
  roles: 'sys_role',
  menus: 'sys_menu',
  dictTypes: 'sys_dict_type',
  dictItems: 'sys_dict_item'
}

function ids(sqlite, table) {
  return sqlite
    .prepare(`SELECT id FROM ${table} ORDER BY id`)
    .all()
    .map((row) => row.id)
}

function fixture(t) {
  const { sqlite, db, close } = database()
  t.after(close)
  sqlite.exec(`
    INSERT INTO sys_user(id, department_id, username, password_hash, display_name, is_super_admin)
    VALUES (1000, 1, 'demo_official', 'fixture-only', 'Official', 1);
    INSERT INTO sys_auth_session(token_hash, user_id, credential_fingerprint, created_at, expires_at)
    VALUES ('a' || printf('%063d', 0), 1000, printf('%064d', 0), 1, 2);
    INSERT INTO sys_user_totp(user_id, secret_encrypted, credential_fingerprint)
    VALUES (1000, 'fixture-only', 'fixture-only');
  `)
  const baseline = Object.fromEntries(
    Object.entries(tables).map(([key, table]) => [key, ids(sqlite, table)])
  )
  const env = {
    DB: db,
    DEMO_CLEANUP_ENABLED: 'true',
    DEMO_CLEANUP_BASELINE: JSON.stringify(baseline)
  }

  sqlite.exec(`
    INSERT INTO sys_department(id, parent_id, name) VALUES
      (1001, 1, 'Visitor parent'), (1002, 1001, 'Visitor child');
    INSERT INTO sys_user(id, department_id, username, password_hash, display_name, deleted_at)
    VALUES (1001, 1002, 'demo_visitor', 'fixture-only', 'Visitor', 3);
    INSERT INTO sys_role(id, code, name) VALUES (1001, 'demo_visitor', 'Visitor');
    INSERT INTO sys_menu(id, parent_id, type, title, path) VALUES
      (1001, 1, 1, 'Visitor parent', '/visitor'),
      (1002, 1001, 1, 'Visitor child', 'child');
    INSERT INTO sys_user_role(user_id, role_id) VALUES
      (1000, 1001), (1001, 1), (1001, 1001);
    INSERT INTO sys_role_menu(role_id, menu_id) VALUES
      (1, 1002), (1001, 1), (1001, 1001);
    INSERT INTO sys_dict_type(id, code, name) VALUES (1001, 'demo_visitor', 'Visitor');
    INSERT INTO sys_dict_item(id, dict_type_id, label, value)
    VALUES (1001, 1001, 'Visitor', 'visitor');
    INSERT INTO sys_auth_session(token_hash, user_id, credential_fingerprint, created_at, expires_at)
    VALUES ('b' || printf('%063d', 0), 1001, printf('%064d', 0), 1, 2);
    INSERT INTO sys_user_totp(user_id, secret_encrypted, credential_fingerprint)
    VALUES (1001, 'fixture-only', 'fixture-only');
    INSERT INTO sys_audit_log (actor_id, target_type, target_id, action, result, status_code, created_at)
    VALUES (1000, 'user', 1001, 'session_revoke', 'success', 200, 1);
  `)
  return { sqlite, baseline, env, db }
}

test('cleanup runs only for the approved cron and explicit enable flag', async () => {
  assert.equal(worker.fetch, undefined)
  const DB = {
    prepare() {
      assert.fail('Disabled cleanup must not access the database')
    }
  }
  for (const flag of [undefined, 'false', true, 'TRUE']) {
    await worker.scheduled(schedule, { DB, DEMO_CLEANUP_ENABLED: flag })
  }
  await worker.scheduled({ cron: '0 0 * * *' }, { DB, DEMO_CLEANUP_ENABLED: 'true' })
})

test('enabled cleanup removes visitor rows and visitor grants, preserving official rows and audit history', async (t) => {
  const { sqlite, baseline, env } = fixture(t)
  const officialSession = sqlite
    .prepare('SELECT * FROM sys_auth_session WHERE user_id = 1000')
    .get()
  const officialTotp = sqlite.prepare('SELECT * FROM sys_user_totp WHERE user_id = 1000').get()
  const audit = sqlite.prepare('SELECT * FROM sys_audit_log').all()

  await worker.scheduled(schedule, env)
  await worker.scheduled(schedule, env)

  for (const [key, table] of Object.entries(tables)) {
    assert.deepEqual(ids(sqlite, table), baseline[key], table)
  }
  assert.deepEqual(sqlite.prepare('SELECT * FROM sys_auth_session').all(), [officialSession])
  assert.deepEqual(sqlite.prepare('SELECT * FROM sys_user_totp').all(), [officialTotp])
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sys_user_role').get().n, 0)
  assert.equal(
    sqlite
      .prepare('SELECT count(*) AS n FROM sys_role_menu WHERE role_id = 1001 OR menu_id >= 1001')
      .get().n,
    0
  )
  assert.deepEqual(sqlite.prepare('SELECT * FROM sys_audit_log').all(), audit)
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), [])
})

test('cleanup rejects invalid baselines and missing bindings before preparing a transaction', async (t) => {
  const { baseline } = fixture(t)
  const DB = {
    prepare() {
      assert.fail('Invalid baseline must not access the database')
    }
  }
  for (const input of [
    undefined,
    '',
    '{}',
    'null',
    '[]',
    '{',
    JSON.stringify({ ...baseline, extra: [1] }),
    JSON.stringify({ ...baseline, users: [] }),
    JSON.stringify({ ...baseline, users: [1000, 1000] }),
    JSON.stringify({ ...baseline, users: [null] }),
    JSON.stringify({ ...baseline, users: ['1000'] }),
    JSON.stringify({ ...baseline, users: [0] }),
    JSON.stringify({ ...baseline, users: [-1] }),
    JSON.stringify({ ...baseline, users: [1.25] }),
    JSON.stringify({ ...baseline, users: [Number.MAX_SAFE_INTEGER + 1] })
  ]) {
    await assert.rejects(
      worker.scheduled(schedule, {
        DB,
        DEMO_CLEANUP_ENABLED: 'true',
        DEMO_CLEANUP_BASELINE: input
      }),
      /baseline/
    )
  }
  await assert.rejects(
    worker.scheduled(schedule, {
      DEMO_CLEANUP_ENABLED: 'true',
      DEMO_CLEANUP_BASELINE: JSON.stringify(baseline)
    }),
    /database binding/
  )
})

test('a configured baseline row missing at transaction time aborts all cleanup', async (t) => {
  const { sqlite, baseline, db, env } = fixture(t)
  const rowsBefore = ids(sqlite, 'sys_user')
  const revisionBefore = sqlite.prepare('SELECT revision FROM sys_data_revision WHERE id = 1').get()
  const DB = {
    prepare: db.prepare,
    batch(statements) {
      const configuredMenu = baseline.menus.at(-1)
      // Model a concurrent change between preparing and starting the batch.
      sqlite.prepare('UPDATE sys_menu SET deleted_at = 1 WHERE id = ?').run(configuredMenu)
      sqlite.prepare('DELETE FROM sys_menu WHERE id = ?').run(configuredMenu)
      return db.batch(statements)
    }
  }
  await assert.rejects(worker.scheduled(schedule, { ...env, DB }), /CHECK constraint failed/)
  assert.deepEqual(ids(sqlite, 'sys_user'), rowsBefore)
  assert.equal(
    sqlite.prepare('SELECT revision FROM sys_data_revision WHERE id = 1').get().revision,
    revisionBefore.revision + 2
  )
})

for (const sql of [
  'UPDATE sys_user SET department_id = 1002 WHERE id = 1000',
  'UPDATE sys_department SET parent_id = 1002 WHERE id = 2',
  'UPDATE sys_menu SET parent_id = 1002 WHERE id = 10',
  'UPDATE sys_dict_item SET dict_type_id = 1001 WHERE id = 1'
]) {
  test(`invalidating a retained direct reference rolls back visitor cleanup (${sql.split(' ')[1]})`, async (t) => {
    const { sqlite, env } = fixture(t)
    sqlite.exec(sql)
    const revisionBefore = sqlite
      .prepare('SELECT revision FROM sys_data_revision WHERE id = 1')
      .get()
    const sessionsBefore = sqlite.prepare('SELECT * FROM sys_auth_session').all()
    const idsBefore = Object.values(tables).map((table) => ids(sqlite, table))
    await assert.rejects(worker.scheduled(schedule, env), /FOREIGN KEY constraint failed/)
    assert.deepEqual(
      Object.values(tables).map((table) => ids(sqlite, table)),
      idsBefore
    )
    assert.deepEqual(sqlite.prepare('SELECT * FROM sys_auth_session').all(), sessionsBefore)
    assert.deepEqual(
      sqlite.prepare('SELECT revision FROM sys_data_revision WHERE id = 1').get(),
      revisionBefore
    )
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), [])
  })
}
