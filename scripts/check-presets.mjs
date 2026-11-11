import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const cli = resolve(process.argv[2] || join(root, '../create-nova-admin'))
const { createProject } = await import(pathToFileURL(join(cli, 'src/create-project.js')).href)
const temporary = await mkdtemp(join(tmpdir(), 'nova-presets-check-'))
function run(directory, script, args = []) {
  const result = spawnSync(process.execPath, [join(directory, script), ...args], {
    cwd: directory,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEMO_ENABLED: 'false', NPORA_CLOUDFLARE_BUILD: 'false' }
  })
  assert.equal(result.status, 0, `Failed: ${script} in ${directory}`)
}
async function checkLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) await checkLinks(file)
    else if (entry.name.endsWith('.md')) {
      const content = await readFile(file, 'utf8')
      for (const [, target] of content.matchAll(/\]\(([^\s)]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue
        assert.ok(
          existsSync(resolve(dirname(file), target.split('#')[0])),
          `${file}: broken link ${target}`
        )
      }
    }
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
    assert.equal(pkg.scripts['update:presets'], undefined)
    assert.equal(pkg.scripts['check:presets'], undefined)
    for (const entry of ['database/mysql/01-schema.sql', 'database/mysql/02-seed.sql'])
      assert.equal(
        await readFile(join(directory, entry), 'utf8'),
        await readFile(join(root, entry), 'utf8')
      )
    assert.equal(existsSync(join(directory, 'examples')), preset === 'demo')
    assert.equal(existsSync(join(directory, 'deploy')), preset === 'demo')
    assert.equal(existsSync(join(directory, 'workers')), preset !== 'starter')
    assert.equal(existsSync(join(directory, 'scaffold')), false)
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
      assert.doesNotMatch(
        await readFile(join(directory, 'pnpm-lock.yaml'), 'utf8'),
        /@cloudflare\/vite-plugin|workerd@|cf@1\./
      )
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
    await checkLinks(join(directory, 'docs'))
    await checkLinks(join(directory, 'database'))
    // Reuse installed dependencies for compilation; frozen-lock installation is checked separately.
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
    run(
      directory,
      'node_modules/vue-tsc/bin/vue-tsc.js',
      preset === 'demo' ? ['-p', 'tsconfig.demo.json', '--noEmit'] : ['-b']
    )
    run(directory, 'node_modules/prettier/bin/prettier.cjs', ['--check', '.'])
    run(directory, 'scripts/run-tests.mjs', preset === 'demo' ? ['--all'] : [])
    run(directory, preset === 'demo' ? 'scripts/demo.mjs' : 'node_modules/vite/bin/vite.js', [
      'build'
    ])
    if (preset === 'worker') {
      run(directory, 'workers/api/scripts/build.mjs')
      run(directory, 'scripts/run-tests.mjs', ['--backend'])
    }
    console.log(`Passed generated preset: ${preset}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
