import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** 使用已安装的 Vite，无需通过特定包管理器二次启动。 */
export function runVite(args, env = {}) {
  const require = createRequire(import.meta.url)
  const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js')
  const child = spawn(process.execPath, [vite, ...args], {
    cwd: new URL('../../', import.meta.url),
    stdio: 'inherit',
    env: { ...process.env, ...env }
  })
  child.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exitCode = code ?? 1
  })
  return child
}
