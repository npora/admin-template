import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createTestServer } from '../helpers/environment.mjs'

const server = await createTestServer()
try {
  const { appConfig } = await server.ssrLoadModule('/src/config/app.ts')
  assert.equal(appConfig.demoEnabled, false)
  const { constantRoutes } = await server.ssrLoadModule('/src/router/routes/constant.ts')
  assert.equal(
    constantRoutes
      .find((route) => route.name === 'Layout')
      .children.some((route) => route.name === 'ExampleForm'),
    false
  )
  const { transformDynamicRoutes } = await server.ssrLoadModule(
    '/src/router/utils/dynamic-route.ts'
  )
  assert.equal(
    transformDynamicRoutes([
      { path: '/system/user', name: 'SystemUser', title: 'User', component: 'system/user/index' }
    ]).length,
    1
  )
  assert.throws(
    () =>
      transformDynamicRoutes([
        { path: '/example', name: 'Example', title: 'Example', component: 'examples/table/index' }
      ]),
    /not found/
  )

  assert.equal(existsSync(new URL('../../database/mysql/01-schema.sql', import.meta.url)), true)
  console.log('通过：核心路由不加载演示、系统管理保留、无演示目录仍可解析、正式 SQL 独立保留。')
} finally {
  await server.close()
}
