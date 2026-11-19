const cleanupCron = '0 16 * * *'

// Deleting visitor parents cascades through their sessions and grant links.
const tables = [
  ['users', 'sys_user'],
  ['dictItems', 'sys_dict_item'],
  ['dictTypes', 'sys_dict_type'],
  ['menus', 'sys_menu'],
  ['departments', 'sys_department'],
  ['roles', 'sys_role']
]

function readBaseline(raw) {
  if (typeof raw !== 'string') throw new Error('Demo cleanup baseline is required')
  let baseline
  try {
    baseline = JSON.parse(raw)
  } catch {
    throw new Error('Invalid demo cleanup baseline')
  }
  if (
    !baseline ||
    typeof baseline !== 'object' ||
    Array.isArray(baseline) ||
    Object.keys(baseline).length !== tables.length ||
    tables.some(([key]) => {
      if (!Object.hasOwn(baseline, key)) return true
      const ids = baseline[key]
      return (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
        new Set(ids).size !== ids.length
      )
    })
  ) {
    throw new Error('Invalid demo cleanup baseline')
  }
  return JSON.stringify(baseline)
}

const missingRows = tables
  .map(
    ([key, table]) => `EXISTS (
        SELECT 1 FROM json_each(?1, '$.${key}') AS allowed
        WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE id = allowed.value)
      )`
  )
  .join(' OR ')

export default {
  async scheduled(event, env) {
    if (event.cron !== cleanupCron || env.DEMO_CLEANUP_ENABLED !== 'true') return

    const baseline = readBaseline(env.DEMO_CLEANUP_BASELINE)
    const { DB: db } = env
    if (!db) throw new Error('Demo cleanup database binding is required')

    // The guard performs no write on success. A missing baseline row attempts to insert
    // an impossible revision key, causing the existing CHECK constraint to abort the batch.
    const guard = db
      .prepare(
        `INSERT INTO sys_data_revision (id, revision)
        SELECT 0, 0 WHERE NOT EXISTS (SELECT 1 FROM sys_data_revision WHERE id = 1)
        OR ${missingRows}`
      )
      .bind(baseline)

    // Defer checks across visitor-only hierarchies. A retained row that still references
    // a deleted visitor row causes the transaction to roll back at commit.
    await db.batch([
      db.prepare('PRAGMA defer_foreign_keys = ON'),
      guard,
      ...tables.map(([key, table]) =>
        db
          .prepare(
            `DELETE FROM ${table} WHERE id NOT IN (SELECT value FROM json_each(?1, '$.${key}'))`
          )
          .bind(baseline)
      )
    ])
  }
}
