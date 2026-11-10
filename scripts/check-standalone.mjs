import { cp, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'npora-frontend-only-'))
try {
  for (const name of [
    'src',
    'build',
    'scripts',
    'tests',
    'database',
    'index.html',
    'vite.config.ts',
    'package.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    '.env',
    '.env.development',
    '.env.production',
    '.prettierrc.json'
  ]) {
    await cp(join(root, name), join(directory, name), { recursive: true })
  }
  await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
  for (const args of [['run', 'typecheck'], ['test'], ['exec', 'vite', 'build']]) {
    const result = spawnSync('pnpm', args, { cwd: directory, stdio: 'inherit' })
    if (result.status !== 0) process.exitCode = result.status ?? 1
    if (process.exitCode) break
  }
  if (!process.exitCode)
    console.log(
      '通过：不包含 examples/、workers/ 与 deploy/ 的独立前端通过类型、核心测试和生产构建。'
    )
} finally {
  await rm(directory, { recursive: true, force: true })
}
