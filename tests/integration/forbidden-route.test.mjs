import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import {
  createStubRouter,
  createTestServer,
  installMemoryStorage
} from '../helpers/environment.mjs'

test('authenticated system deep links distinguish missing authorization from unknown pages', async (t) => {
  installMemoryStorage()
  const server = await createTestServer()
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  t.after(async () => {
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    await server.close()
  })

  let calls = 0
  const routes = []
  globalThis.fetch = async (input) => {
    assert.ok(String(input).endsWith('/api/auth/session'))
    calls += 1
    return Response.json({
      code: 0,
      message: 'success',
      data: {
        user: {
          id: 1,
          username: 'fixture',
          displayName: 'Fixture',
          departmentId: null,
          isSuperAdmin: false,
          roles: [],
          permissions: []
        },
        routes
      }
    })
  }

  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { getSession } = await load('services/session.ts')
  const { constantRoutes } = await load('router/routes/constant.ts')
  const { setupAuthGuard } = await load('router/guards/auth.ts')
  const { setupTitleGuard } = await load('router/guards/title.ts')
  const { applyLocale } = await load('locales/index.ts')
  const router = createStubRouter(constantRoutes)
  const session = getSession(router)
  const fallback = constantRoutes.find(({ name }) => name === 'RouteFallback')
  globalThis.document = { title: '', documentElement: { lang: '' } }
  applyLocale('zh-CN')
  t.after(setupAuthGuard(router))
  t.after(setupTitleGuard(router))

  const deepLink = '/SYSTEM/ROLE/?tab=details#selected'
  await router.push(deepLink)
  assert.equal(router.currentRoute.value.name, 'Login')
  assert.equal(router.currentRoute.value.query.redirect, deepLink)
  assert.equal(calls, 0)

  tokenStorage.set(randomUUID())
  await router.push(deepLink)
  assert.equal(calls, 1)
  assert.equal(router.currentRoute.value.name, 'RouteFallback')
  assert.equal(router.currentRoute.value.fullPath, deepLink)
  assert.deepEqual(fallback.props(router.currentRoute.value), { forbidden: true })
  assert.match(document.title, /^403 权限不足 - /)
  applyLocale('en-US')
  assert.match(document.title, /^403 Access denied - /)

  for (const path of ['/system', '/system/unknown', '/system/role/detail', '/outside']) {
    await router.push(path)
    assert.equal(router.currentRoute.value.name, 'RouteFallback')
    assert.deepEqual(fallback.props(router.currentRoute.value), { forbidden: false })
    assert.match(document.title, /^404 - /)
  }
  assert.equal(calls, 1)

  session.clearSession()
  routes.push(
    { path: '/system/role', name: 'SystemRole', title: '角色管理', component: 'system/role/index' },
    { path: '/403', name: 'Forbidden', title: 'Custom page', component: 'system/user/index' }
  )
  tokenStorage.set(randomUUID())
  await router.push(deepLink)
  assert.equal(calls, 2)
  assert.equal(router.currentRoute.value.name, 'SystemRole')
  assert.equal(router.currentRoute.value.fullPath, deepLink)
  assert.match(document.title, /^Roles - /)

  await router.push('/403')
  assert.equal(router.currentRoute.value.name, 'Forbidden')
  assert.match(document.title, /^Custom page - /)
})
