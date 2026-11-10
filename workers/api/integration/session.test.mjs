import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../src/index.mjs'
import { service, password } from '../tests/helpers/service.mjs'
import {
  createTestServer,
  createStubRouter,
  installMemoryStorage,
  waitFor
} from '../../../tests/helpers/environment.mjs'

test('HTTP error lifecycle preserves sessions, retries once and isolates late 401 responses', async (t) => {
  const f = await service(t)
  installMemoryStorage()
  const server = await createTestServer({ demo: true })
  t.after(() => server.close())
  const originalFetch = globalThis.fetch
  const handlers = new Map()
  const calls = new Map()
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input), 'https://api.example.test')
    const path = url.pathname.replace(/^\/api(?=\/|$)/, '')
    calls.set(path, (calls.get(path) || 0) + 1)
    return handlers.has(path)
      ? handlers.get(path)(calls.get(path))
      : worker.fetch(new Request(url, init), f.env)
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { constantRoutes } = await load('router/routes/constant.ts')
  const router = createStubRouter(constantRoutes)
  const { setupRequestErrorHandling } = await load('router/request-errors.ts')
  const { setupAuthGuard } = await load('router/guards/auth.ts')
  const { getSession } = await load('services/session.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { request, publicRequest } = await load('api/client.ts')
  const { handleRequestError } = await load('api/errors/handling.ts')
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useTabsStore } = await load('store/modules/tabs/index.ts')
  const { useViewsStore } = await load('store/modules/views/index.ts')
  const permissions = usePermissionStore(pinia)
  const tabs = useTabsStore(pinia)
  const views = useViewsStore(pinia)
  const notices = []
  t.after(setupRequestErrorHandling(router, (message) => notices.push(message)))
  setupAuthGuard(router)
  const session = getSession(router)
  const restore = async (path = '/system/user?filter=active#row') => {
    session.clearSession()
    tokenStorage.set(f.admin)
    await session.initialize()
    await router.push(path)
    notices.length = 0
  }
  const reply = (status, code = status, message = 'error') =>
    Response.json({ code, message, data: null }, { status })
  await restore()
  await assert.rejects(
    publicRequest.post('/auth/login', { json: { username: 'admin', password: 'wrong' } })
  )
  assert.equal(permissions.ready, true)
  notices.length = 0
  handlers.set('/forbidden', async () => reply(403))
  const forbidden = await request.get('/forbidden').catch((e) => e)
  handleRequestError(forbidden)
  assert.deepEqual(notices, ['没有执行此操作的权限'])
  assert.equal(permissions.ready, true)
  notices.length = 0
  handlers.set('/recover', async (count) =>
    count === 1 ? reply(503) : Response.json({ code: 0, message: 'ok', data: { ok: true } })
  )
  assert.deepEqual(
    await request.get('/recover', { extensions: { retry: { delay: 0, jitter: false } } }),
    { ok: true }
  )
  assert.equal(calls.get('/recover'), 2)
  assert.deepEqual(notices, [])
  handlers.set('/failure', async () => reply(503))
  await assert.rejects(
    request.get('/failure', { extensions: { retry: { retries: 2, delay: 0, jitter: false } } })
  )
  assert.equal(calls.get('/failure'), 3)
  assert.deepEqual(notices, ['服务器暂时不可用，请稍后重试'])
  notices.length = 0
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(request.get('/cancelled', { signal: controller.signal }))
  assert.deepEqual(notices, [])

  views.trackView('/system/user', true)
  tabs.addTab({ path: '/system/user', title: 'User' })
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  handlers.set('/expired', async () => {
    await gate
    return reply(401)
  })
  const results = Promise.allSettled([request.get('/expired'), request.get('/expired')])
  await waitFor(() => calls.get('/expired') === 2)
  release()
  assert.ok((await results).every((result) => result.status === 'rejected'))
  await waitFor(() => router.currentRoute.value.path === '/login')
  assert.deepEqual(notices, ['登录状态已失效，请重新登录'])
  assert.equal(router.currentRoute.value.query.redirect, '/system/user?filter=active#row')
  assert.equal(tokenStorage.get(), null)
  assert.equal(permissions.ready, false)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(tabs.tabs.length, 0)
  assert.equal(views.cachedViews.length, 0)

  await restore()
  let releaseOld
  const oldGate = new Promise((resolve) => {
    releaseOld = resolve
  })
  handlers.set('/old', async () => {
    await oldGate
    return reply(401)
  })
  const oldFailure = request.get('/old').catch((e) => e)
  await waitFor(() => calls.has('/old'))
  await restore('/system/role')
  releaseOld()
  await oldFailure
  assert.equal(permissions.ready, true)
  assert.equal(tokenStorage.get(), f.admin)
  assert.equal(router.currentRoute.value.path, '/system/role')
  assert.deepEqual(notices, [])

  handlers.set('/silent-expired', async () => reply(200, '10002', 'expired'))
  await assert.rejects(request.get('/silent-expired', { context: { silentError: true } }))
  await waitFor(() => router.currentRoute.value.path === '/login')
  assert.equal(tokenStorage.get(), null)
  assert.deepEqual(notices, [])
  await restore()
  session.clearSession()
  tokenStorage.set('invalid-token')
  await router.push('/system/user?from=reload#row')
  assert.equal(router.currentRoute.value.path, '/login')
  assert.equal(router.currentRoute.value.query.redirect, '/system/user?from=reload#row')
  assert.equal(tokenStorage.get(), null)
})

test('core frontend restores only system management menus without loading showcase routes', async (t) => {
  const f = await service(t)
  for (let id = 48; id >= 40; id--) f.sqlite.prepare('DELETE FROM sys_menu WHERE id=?').run(id)
  installMemoryStorage()
  const server = await createTestServer()
  t.after(() => server.close())
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) =>
    worker.fetch(new Request(new URL(String(input), 'https://api.example.test'), init), f.env)
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { constantRoutes } = await load('router/routes/constant.ts')
  const router = createStubRouter(constantRoutes)
  const { getSession } = await load('services/session.ts')
  await getSession(router).signIn({ username: 'admin', password })
  assert.equal(router.hasRoute('SystemUser'), true)
  assert.equal(router.hasRoute('SystemRole'), true)
  assert.equal(router.hasRoute('SystemDepartment'), true)
  assert.equal(router.hasRoute('SystemMenu'), true)
  assert.equal(router.hasRoute('SystemTable'), false)
  assert.equal(router.hasRoute('ExampleForm'), false)
})
