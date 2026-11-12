import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2).filter((arg) => arg !== '--')
const install = args.includes('--install')
const manager = args.find((arg) => arg.startsWith('--manager='))?.slice(10) ?? 'npm'
assert.ok(['npm', 'pnpm', 'yarn'].includes(manager), 'Use --manager=npm, pnpm or yarn')
const positional = args.filter((arg) => !arg.startsWith('--'))
assert.ok(
  args.every((arg) => !arg.startsWith('--') || arg === '--install' || arg.startsWith('--manager=')),
  'Unknown preset check option'
)
assert.ok(positional.length <= 1, 'Provide at most one generator directory')
const cli = resolve(positional[0] || join(root, '../create-nova-admin'))
const { createProject } = await import(pathToFileURL(join(cli, 'src/create-project.js')).href)
const temporary = await mkdtemp(join(tmpdir(), 'nova-presets-check-'))
function run(directory, args) {
  const result = spawnSync(manager, args, {
    cwd: directory,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_DEMO_ENABLED: 'false', NPORA_CLOUDFLARE_BUILD: 'false' }
  })
  assert.equal(result.status, 0, `Failed: ${manager} ${args.join(' ')} in ${directory}`)
}
async function checkMarkdownLinks(file) {
  const content = await readFile(file, 'utf8')
  for (const [, target] of content.matchAll(/\]\(([^\s)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue
    assert.ok(
      existsSync(resolve(dirname(file), target.split('#')[0])),
      `${file}: broken link ${target}`
    )
  }
}
async function checkLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) await checkLinks(file)
    else if (entry.name.endsWith('.md')) await checkMarkdownLinks(file)
  }
}

try {
  for (const preset of ['starter', 'worker', 'demo']) {
    const { directory } = await createProject({
      projectName: `check-${preset}`,
      cwd: temporary,
      templateDir: root,
      preset
    })
    const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    assert.equal(pkg.packageManager, undefined, 'Generated projects must not pin a manager')
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'))
    assert.equal(lock.name, pkg.name)
    assert.equal(lock.packages[''].name, pkg.name)
    for (const command of Object.values(pkg.scripts))
      assert.doesNotMatch(
        command,
        /\b(?:pnpm|npm|yarn)\b/,
        'Scripts must not nest a package manager'
      )
    assert.equal(pkg.scripts['update:presets'], undefined)
    assert.equal(pkg.scripts['check:presets'], undefined)
    for (const entry of [
      'LICENSE',
      'CHANGELOG.md',
      'database/mysql/01-schema.sql',
      'database/mysql/02-seed.sql',
      'database/mysql/03-dictionaries.sql',
      'database/mysql/04-query-indexes.sql'
    ])
      assert.equal(
        await readFile(join(directory, entry), 'utf8'),
        await readFile(join(root, entry), 'utf8')
      )
    assert.equal(existsSync(join(directory, 'examples')), preset === 'demo')
    assert.equal(existsSync(join(directory, 'deploy')), preset === 'demo')
    assert.equal(existsSync(join(directory, 'workers')), preset !== 'starter')
    for (const entry of [
      'src/views/login/index.vue',
      'src/views/dashboard/index.vue',
      'src/layout/index.vue'
    ])
      assert.ok(existsSync(join(directory, entry)), `${preset} must retain ${entry}`)
    assert.equal(existsSync(join(directory, 'scaffold')), false)
    assert.equal(
      existsSync(join(directory, 'AGENTS.md')),
      false,
      'Local assistant rules must not leak'
    )
    if (preset !== 'demo') {
      assert.equal(existsSync(join(directory, 'scripts/lib')), false)
      assert.doesNotMatch(await readFile(join(directory, '.env'), 'utf8'), /VITE_DEMO_ENABLED/)
    }
    assert.equal(existsSync(join(directory, '.github/workflows/presets.yml')), false)
    const workflow = await readFile(join(directory, '.github/workflows/ci.yml'), 'utf8')
    assert.doesNotMatch(workflow, /check:presets|repository: (?:npora|ni9542)\//)
    if (preset !== 'demo') assert.doesNotMatch(workflow, /check:standalone|check:all/)

    assert.equal(existsSync(join(directory, 'workers/api/.local')), false)
    if (preset !== 'demo') {
      for (const dependency of ['cf', '@cloudflare/vite-plugin'])
        assert.equal(pkg.devDependencies[dependency], undefined)
      for (const script of ['dev:demo', 'typecheck:demo', 'deploy:cloudflare', 'check:all'])
        assert.equal(pkg.scripts[script], undefined)
      assert.doesNotMatch(
        await readFile(join(directory, 'vite.config.ts'), 'utf8'),
        /cloudflare|optional-examples/
      )
      for (const dependency of ['cf', '@cloudflare/vite-plugin', 'workerd'])
        assert.equal(lock.packages[`node_modules/${dependency}`], undefined)
    }
    if (preset === 'worker') {
      assert.doesNotMatch(
        await readFile(join(directory, 'workers/api/migrations/0002_seed.sql'), 'utf8'),
        /examples\//
      )
      assert.doesNotMatch(
        await readFile(join(directory, 'workers/api/src/config/pages.mjs'), 'utf8'),
        /examples\//
      )
    }
    await checkMarkdownLinks(join(directory, 'README.md'))
    if (preset !== 'starter') await checkMarkdownLinks(join(directory, 'workers/api/README.md'))
    await checkLinks(join(directory, 'docs'))
    await checkLinks(join(directory, 'database'))
    if (install) {
      console.log(`Installing independent preset: ${preset}`)
      run(directory, manager === 'npm' ? ['ci'] : ['install'])
    } else {
      // Fast local check; CI uses --install to verify each preset's own dependencies.
      await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
    }
    run(directory, ['run', preset === 'demo' ? 'check:all' : 'check'])
    run(directory, ['run', preset === 'demo' ? 'build:demo' : 'build'])
    if (preset === 'worker') run(directory, ['run', 'check:backend'])
    console.log(`Passed generated preset: ${preset}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
