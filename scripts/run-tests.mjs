import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const directory = new URL('../tests/integration/', import.meta.url)
const [selector] = process.argv.slice(2)
const files = readdirSync(directory)
  .filter((file) => file.endsWith('.test.mjs') && (!selector || file === `${selector}.test.mjs`))
  .map((file) => resolve(fileURLToPath(directory), file))
if (!files.length) throw new Error(`No matching integration tests: ${selector}`)
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit'
})
process.exit(result.status ?? 1)
