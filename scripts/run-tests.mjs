import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = new URL('../', import.meta.url)
const args = process.argv.slice(2)
const selector = args.find((arg) => !arg.startsWith('--'))
const optional = [
  'examples/tests',
  'workers/api/tests',
  'workers/api/integration',
  'deploy/cloudflare/tests'
]
const directories = args.includes('--all')
  ? ['tests/integration', ...optional]
  : args.includes('--examples')
    ? ['examples/tests']
    : args.includes('--backend')
      ? ['workers/api/tests', 'workers/api/integration']
      : ['tests/integration']
const files = directories.flatMap((directory) => {
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
