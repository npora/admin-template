import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = new URL('../', import.meta.url)
const selector = process.argv[2]
const files = [
  'tests/integration',
  'mock/tests',
  'workers/api/tests',
  'workers/api/integration'
].flatMap((directory) => {
  const path = new URL(`${directory}/`, root)
  return existsSync(path)
    ? readdirSync(path)
        .filter(
          (file) => file.endsWith('.test.mjs') && (!selector || file === `${selector}.test.mjs`)
        )
        .map((file) => resolve(fileURLToPath(path), file))
    : []
})
if (files.length) {
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
    stdio: 'inherit'
  })
  process.exit(result.status ?? 1)
} else console.log(`No optional test suite installed${selector ? `: ${selector}` : ''}.`)
