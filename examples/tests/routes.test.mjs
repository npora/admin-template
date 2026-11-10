import assert from 'node:assert/strict'
import { createTestServer } from '../../tests/helpers/environment.mjs'

const server = await createTestServer({ demo: true })
try {
  const { appConfig } = await server.ssrLoadModule('/src/config/app.ts')
  assert.equal(appConfig.demoEnabled, true)
  const { constantRoutes } = await server.ssrLoadModule('/src/router/routes/constant.ts')
  assert.equal(
    constantRoutes
      .find((route) => route.name === 'Layout')
      .children.some((route) => route.name === 'ExampleForm'),
    true
  )
  const { demoViews, demoDashboard } = await server.ssrLoadModule('/examples/index.ts')
  assert.equal(typeof demoDashboard, 'function')
  assert.ok('/src/views/examples/table/index.vue' in demoViews)
  assert.equal(
    Object.keys(demoViews).some((path) => path.includes('/components/')),
    false
  )
  const { transformDynamicRoutes } = await server.ssrLoadModule(
    '/src/router/utils/dynamic-route.ts'
  )
  assert.equal(
    transformDynamicRoutes([
      { path: '/example', name: 'Example', title: 'Example', component: 'examples/table/index' }
    ]).length,
    1
  )
  assert.throws(
    () =>
      transformDynamicRoutes([
        {
          path: '/internal',
          name: 'Internal',
          title: 'Internal',
          component: 'examples/table/components/TaskFormDialog'
        }
      ]),
    /not found/
  )
  console.log(
    '通过：展示模式加载美化首页与示例路由，保留后端 component 契约，内部弹窗不可注册路由。'
  )
} finally {
  await server.close()
}
