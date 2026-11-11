import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8')
const sqliteDictionary = migration('0005_dictionaries.sql')
const mysqlDictionary = readFileSync(
  new URL('../../../database/mysql/03-dictionaries.sql', import.meta.url),
  'utf8'
)
// Repository-only fixture: the formal core seed has the same menu model without demo nodes.
const coreSeed = readFileSync(
  new URL('../../../database/mysql/02-seed.sql', import.meta.url),
  'utf8'
)
  .replace('SET NAMES utf8mb4;', '')
  .replace('START TRANSACTION;', 'BEGIN;')
const permissionCodes = ['dict', 'dict-item'].flatMap((resource) =>
  ['list', 'create', 'update', 'delete'].map((action) => `system:${resource}:${action}`)
)
const rows = (db, table) =>
  db
    .prepare(`SELECT * FROM ${table} ORDER BY 1,2`)
    .all()
    .map((row) => ({ ...row }))

// The portable menu INSERT/SELECT statements are executed for both SQL files.
// The MySQL schema itself is validated separately against a temporary MySQL server.
const mysqlMenuSeed = mysqlDictionary
  .slice(mysqlDictionary.indexOf('INSERT INTO sys_menu('))
  .replace(/COMMIT;\s*$/, '')
for (const [seedName, seed] of [
  ['demo', migration('0002_seed.sql')],
  ['core', coreSeed]
]) {
  for (const [scenario, count, softDelete] of [
    ['occupied', 15, false],
    ['soft-deleted', 6, true]
  ]) {
    for (const dialect of ['SQLite', 'MySQL menu DML']) {
      test(`${dialect} dictionary upgrade preserves ${seedName} menus with ${scenario} IDs`, () => {
        const db = new DatabaseSync(':memory:')
        try {
          db.exec('PRAGMA foreign_keys=ON')
          db.exec(migration('0001_schema.sql'))
          db.exec(seed)
          db.exec(migration('0003_auth_revocation.sql'))
          db.exec(migration('0004_management_guards.sql'))
          const insert = db.prepare(
            'INSERT INTO sys_menu(parent_id,type,title,permission,sort_order) VALUES(1,3,?,?,0)'
          )
          let last
          for (let index = 0; index < count; index++)
            last = Number(
              insert.run(`Custom ${index}`, `custom:operation:${index}`).lastInsertRowid
            )
          assert.ok(last >= 60, 'fixture must occupy the old reserved range')
          if (softDelete)
            db.prepare("UPDATE sys_menu SET deleted_at='2026-11-01T00:00:00Z' WHERE id=?").run(last)
          const beforeMenus = rows(db, 'sys_menu')
          const beforeGrants = rows(db, 'sys_role_menu')
          const maxId = db.prepare('SELECT max(id) AS id FROM sys_menu').get().id
          if (dialect === 'SQLite') db.exec(sqliteDictionary)
          else {
            db.exec(sqliteDictionary.slice(0, sqliteDictionary.indexOf('INSERT INTO sys_menu(')))
            db.exec(mysqlMenuSeed)
          }
          db.exec(migration('0006_query_indexes.sql'))
          const page = db.prepare("SELECT * FROM sys_menu WHERE name='SystemDict'").get()
          assert.ok(page.id > maxId, 'the database must allocate a fresh menu ID')
          assert.equal(page.parent_id, 1)
          assert.equal(page.component, 'system/dict/index')
          const buttons = db
            .prepare('SELECT * FROM sys_menu WHERE parent_id=? ORDER BY sort_order')
            .all(page.id)
          assert.equal(buttons.length, 8)
          assert.deepEqual(
            buttons.map((row) => row.permission),
            permissionCodes
          )
          assert.ok(buttons.every((row) => row.id > maxId && row.type === 3))
          assert.deepEqual(
            rows(db, 'sys_menu').filter((row) => row.id <= maxId),
            beforeMenus
          )
          const newIds = new Set([page.id, ...buttons.map((row) => row.id)])
          const grants = rows(db, 'sys_role_menu')
          assert.deepEqual(
            grants.filter((row) => !newIds.has(row.menu_id)),
            beforeGrants
          )
          const admin = db.prepare("SELECT id FROM sys_role WHERE code='admin'").get().id
          const newGrants = grants.filter((row) => newIds.has(row.menu_id))
          assert.equal(newGrants.length, 9)
          assert.ok(newGrants.every((row) => row.role_id === admin))
          assert.deepEqual(new Set(newGrants.map((row) => row.menu_id)), newIds)
          assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
        } finally {
          db.close()
        }
      })
    }
  }
}
