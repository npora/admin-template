import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'

// Real SQLite executes the checked-in migrations. This shim models only the D1 methods used here.
export function database() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const file of readdirSync(new URL('../../migrations/', import.meta.url))
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    sqlite.exec('BEGIN')
    try {
      sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'))
      sqlite.exec('COMMIT')
    } catch (error) {
      sqlite.exec('ROLLBACK')
      sqlite.close()
      throw error
    }
  }
  const db = {
    prepare(sql) {
      // Node's binding API treats ?1 differently from D1.bind positional arguments.
      // Preserve SQLite numbered-parameter semantics, including repeated indices.
      const order = []
      const statement = sqlite.prepare(
        sql.replace(/\?(\d+)/g, (_, index) => {
          order.push(Number(index) - 1)
          return '?'
        })
      )
      let parameters = []
      const values = () => (order.length ? order.map((index) => parameters[index]) : parameters)
      const totalChanges = () =>
        Number(sqlite.prepare('SELECT total_changes() AS count').get().count)
      const execute = () => {
        const before = totalChanges()
        const results = statement.all(...values()).map((row) => ({ ...row }))
        // D1 meta.changes includes writes performed by triggers, unlike SQLite changes().
        return { success: true, results, meta: { changes: totalChanges() - before } }
      }
      return {
        bind(...values) {
          parameters = values
          return this
        },
        async first() {
          return statement.get(...values()) ?? null
        },
        async all() {
          return execute()
        },
        async run() {
          return execute()
        },
        execute
      }
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map((statement) => statement.execute())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    }
  }
  return { db, sqlite, close: () => sqlite.close() }
}
