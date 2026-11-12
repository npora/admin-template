import { readFile, writeFile, cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const scripts = [
  'dev',
  'build',
  'preview',
  'typecheck',
  'format',
  'format:check',
  'test',
  'check',
  'check:views',
  'check:locales'
]
pkg.scripts = Object.fromEntries(scripts.map((name) => [name, pkg.scripts[name]]))
delete pkg.devDependencies['@cloudflare/vite-plugin']
delete pkg.devDependencies.cf
const output = join(root, 'scaffold/core')
const temporary = await mkdtemp(join(tmpdir(), 'nova-preset-lock-'))
try {
  await writeFile(join(temporary, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
  await cp(join(root, 'package-lock.json'), join(temporary, 'package-lock.json'))
  const result = spawnSync(
    'npm',
    ['install', '--package-lock-only', '--ignore-scripts', '--offline', '--no-audit', '--no-fund'],
    { cwd: temporary, shell: process.platform === 'win32', stdio: 'inherit' }
  )
  if (result.status !== 0) throw new Error('Unable to regenerate preset lockfile')
  await writeFile(join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
  await cp(join(temporary, 'package-lock.json'), join(output, 'package-lock.json'))
  await writeFile(
    join(root, 'scaffold/metadata.json'),
    JSON.stringify(
      {
        version: 2,
        sourceLockHash: createHash('sha256')
          .update(await readFile(join(root, 'package-lock.json')))
          .digest('hex')
      },
      null,
      2
    ) + '\n'
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
