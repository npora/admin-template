import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const root = new URL('../', import.meta.url)
if (existsSync(new URL('workers/api/package.json', root))) {
  for (const args of [['workers/api/scripts/build.mjs'], ['scripts/run-tests.mjs', '--backend']]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
