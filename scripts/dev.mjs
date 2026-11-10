import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const [source, ...args] = process.argv.slice(2)
if (!['mock', 'api'].includes(source)) {
  console.error('用法：node scripts/dev.mjs <mock|api> [Vite 参数]')
  process.exit(1)
}

// 命令环境优先于 .env*，只覆盖数据源开关，其余配置继续由 Vite 加载。
const require = createRequire(import.meta.url)
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const child = spawn(process.execPath, [vite, ...args], {
  stdio: 'inherit',
  env: { ...process.env, VITE_API_MOCK: String(source === 'mock') }
})
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
