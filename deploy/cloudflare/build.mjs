import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const result = spawnSync('pnpm', ['exec', 'vite', 'build'], {
  cwd: fileURLToPath(new URL('../../', import.meta.url)),
  env: { ...process.env, NPORA_CLOUDFLARE_BUILD: 'true' },
  stdio: 'inherit'
})
process.exit(result.status ?? 1)
