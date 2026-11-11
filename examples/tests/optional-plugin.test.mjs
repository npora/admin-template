import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createTestServer } from '../../tests/helpers/environment.mjs'
const server = await createTestServer()
try {
  const { optionalExamples } = await server.ssrLoadModule('/build/optional-examples.ts')
  const missing = fileURLToPath(new URL('../../node_modules/.missing-examples', import.meta.url))
  const core = optionalExamples(missing, false)
  assert.equal(core.enabled, false)
  const id = core.plugin.resolveId('virtual:admin-examples')
  assert.equal(core.plugin.load(id).includes('/examples/index.ts'), false)
  assert.throws(() => optionalExamples(missing, true), /演示入口不存在/)
} finally {
  await server.close()
}
