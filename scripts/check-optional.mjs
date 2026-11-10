import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const root = new URL('../', import.meta.url)
if (existsSync(new URL('mock/tsconfig.json', root))) {
  const result = spawnSync('pnpm', ['exec', 'vue-tsc', '-p', 'mock/tsconfig.json', '--noEmit'], {
    stdio: 'inherit'
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync(new URL('workers/api/package.json', root))) {
  const result = spawnSync('pnpm', ['--dir', 'workers/api', 'run', 'build'], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
