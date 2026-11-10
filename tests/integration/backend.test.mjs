import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createTestServer } from '../helpers/environment.mjs'

const server = await createTestServer()
try {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const available = existsSync(new URL('../../mock/index.ts', import.meta.url))
  const { appConfig } = await server.ssrLoadModule('/src/config/app.ts')
  assert.equal(appConfig.mockEnabled, available && server.config.env.VITE_API_MOCK === 'true')

  const { optionalMock } = await server.ssrLoadModule('/build/optional-mock.ts')
  for (const [directory, enabled, expectedAvailable, expectedImport] of [
    [root, true, available, available],
    [root, false, available, false],
    [
      fileURLToPath(new URL('../../node_modules/.missing-backend', import.meta.url)),
      true,
      false,
      false
    ]
  ]) {
    const mock = optionalMock(directory, enabled)
    assert.equal(mock.available, expectedAvailable)
    const id = mock.plugin.resolveId('virtual:admin-mock')
    assert.equal(mock.plugin.resolveId('unrelated-module'), undefined)
    const source = mock.plugin.load(id)
    assert.equal(source.includes('from "/mock/index.ts"'), expectedImport)
    assert.equal(mock.plugin.load('unrelated-module'), undefined)
  }
  console.log('通过：Mock 开关、目录缺失自动回退、生产禁用适配器和可选模块解析。')
} finally {
  await server.close()
}
