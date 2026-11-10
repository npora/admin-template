import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const child = spawn(process.execPath, [vite, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEMO_ENABLED: 'true',
    // 仅开发时的展示 API 代理目标；生产继续走站点同源 /api。
    VITE_API_URL: process.env.VITE_API_URL || 'https://npora-admin-api-test.npora.workers.dev'
  }
})
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
