import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareRelease, verifyRelease } from './prepare.mjs'

test('release preparation synchronizes both repositories and lockfiles', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'npora-release-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const template = join(root, 'template'),
    generator = join(root, 'generator')
  await mkdir(template)
  await mkdir(generator)
  for (const [dir, version] of [
    [template, '1.0.0'],
    [generator, '1.0.10']
  ]) {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: dir === generator ? '@npora/create-admin' : 'admin-template',
        private: dir !== generator,
        version,
        dependencies: { vue: '^3.5.41' }
      })
    )
    await writeFile(
      join(dir, 'package-lock.json'),
      JSON.stringify({
        version,
        packages: { '': { version }, 'node_modules/vue': { version: '3.5.41' } }
      })
    )
  }
  const before = await readFile(join(generator, 'package.json'), 'utf8')
  for (const input of ['1.0.9', '1.0.10', 'v1.0.11', '1.0.11;echo', '1.0.11-beta.1']) {
    await assert.rejects(prepareRelease(template, generator, input))
    assert.equal(await readFile(join(generator, 'package.json'), 'utf8'), before)
  }
  assert.equal(await prepareRelease(template, generator), '1.0.11')
  assert.equal(await verifyRelease(template, generator, 'v1.0.11'), '1.0.11')
  await assert.rejects(verifyRelease(template, generator, 'v1.0.12'), /不一致/)
  const lock = JSON.parse(await readFile(join(template, 'package-lock.json'), 'utf8'))
  assert.equal(lock.packages['node_modules/vue'].version, '3.5.41')
  lock.packages[''].version = '1.0.10'
  await writeFile(join(template, 'package-lock.json'), JSON.stringify(lock))
  await assert.rejects(verifyRelease(template, generator, 'v1.0.11'), /不一致/)
})
