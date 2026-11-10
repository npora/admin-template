import {
  createTestServer,
  installMemoryStorage,
  createStubRouter,
  waitFor
} from '../../tests/helpers/environment.mjs'
import assert from 'node:assert/strict'

installMemoryStorage()
const server = await createTestServer({ mock: true })
let stop
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { constantRoutes } = await load('router/routes/constant.ts')
  const router = createStubRouter(constantRoutes)
  const replacements = []
  const replace = router.replace.bind(router)
  router.replace = (target) => {
    replacements.push(target)
    return replace(target)
  }
  const { setupRequestErrorHandling } = await load('router/request-errors.ts')
  const { setupAuthGuard } = await load('router/guards/auth.ts')
  const { useSession } = await load('composables/useSession.ts')
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useUserStore } = await load('store/modules/user/index.ts')
  const { useViewsStore } = await load('store/modules/views/index.ts')
  const { useTabsStore } = await load('store/modules/tabs/index.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { request, publicRequest } = await load('api/client.ts')
  const { mockAdapter } = await server.ssrLoadModule('/mock/index.ts')
  const { setupAuthMock } = await server.ssrLoadModule('/mock/modules/auth.ts')
  const { setupRouteMock } = await server.ssrLoadModule('/mock/modules/route.ts')
  const { handleRequestError } = await load('api/errors/handling.ts')
  const notices = []
  stop = setupRequestErrorHandling(router, (message) => notices.push(message))
  setupAuthGuard(router)
  const session = useSession(router)
  const permissions = usePermissionStore(pinia)
  const users = useUserStore(pinia)
  const views = useViewsStore(pinia)
  const tabs = useTabsStore(pinia)
  const signIn = async (path = '/system/user?filter=active#row') => {
    mockAdapter.reset()
    setupAuthMock(mockAdapter)
    setupRouteMock(mockAdapter)
    await session.signIn({ username: 'admin', password: '123456' })
    await router.push(path)
    notices.length = 0
    replacements.length = 0
  }
  await signIn()

  // 公共请求 401 和登录错误不能清理已经存在的登录会话。
  mockAdapter.onPost('/public-login').reply(401, {})
  await assert.rejects(publicRequest.post('/public-login'))
  assert.equal(permissions.ready, true)
  assert.equal(replacements.length, 0)
  assert.deepEqual(notices, ['身份验证失败，请检查登录信息'])
  notices.length = 0
  await assert.rejects(
    publicRequest.post('/auth/login', { json: { username: 'admin', password: 'wrong' } })
  )
  assert.deepEqual(notices, ['用户名或密码错误'])
  assert.equal(permissions.ready, true)

  // 普通错误保留会话；统一报告后，页面 catch 再调用也不重复提示。
  notices.length = 0
  mockAdapter.onGet('/forbidden').reply(403, {})
  const forbidden = await request.get('/forbidden').catch((error) => error)
  handleRequestError(forbidden)
  assert.deepEqual(notices, ['没有执行此操作的权限'])
  assert.equal(permissions.ready, true)
  notices.length = 0
  mockAdapter.onGet('/business').reply(200, { code: 10001, message: '名称已经存在', data: null })
  await assert.rejects(request.get('/business'), /名称已经存在/)
  assert.deepEqual(notices, ['名称已经存在'])
  assert.equal(mockAdapter.history.filter((item) => item.url === '/business').length, 1)

  notices.length = 0
  mockAdapter.onGet('/silent').reply(500, {})
  await assert.rejects(
    request.get('/silent', { context: { silentError: true }, extensions: { retry: 0 } })
  )
  assert.equal(notices.length, 0)
  mockAdapter.onGet('/network').networkError()
  await assert.rejects(request.get('/network', { extensions: { retry: 0 } }))
  assert.deepEqual(notices, ['网络连接失败，请检查网络'])
  notices.length = 0
  mockAdapter.onGet('/timeout').timeout()
  await assert.rejects(request.get('/timeout'))
  assert.deepEqual(notices, ['请求超时，请稍后重试'])
  assert.equal(mockAdapter.history.filter((item) => item.url === '/timeout').length, 1)

  // 只显示重试后的最终错误，恢复成功不弹错误。
  notices.length = 0
  mockAdapter.onGet('/recover').replyOnce(503, {})
  mockAdapter.onGet('/recover').reply(200, { code: 0, message: 'ok', data: { ok: true } })
  const recovered = await request.get('/recover', {
    extensions: { retry: { delay: 0, jitter: false } }
  })
  assert.equal(recovered.data.ok, true)
  assert.equal(mockAdapter.history.filter((item) => item.url === '/recover').length, 2)
  assert.equal(notices.length, 0)
  mockAdapter.onGet('/failure').reply(503, {})
  await assert.rejects(
    request.get('/failure', { extensions: { retry: { retries: 2, delay: 0, jitter: false } } })
  )
  assert.equal(mockAdapter.history.filter((item) => item.url === '/failure').length, 3)
  assert.deepEqual(notices, ['服务器暂时不可用，请稍后重试'])

  notices.length = 0
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(request.get('/cancelled', { signal: controller.signal }))
  assert.equal(notices.length, 0)

  // 两个在途请求一起 401，只提示、清理和跳转一次，并保留完整原地址。
  views.trackView('/system/user', true)
  tabs.addTab({ path: '/system/user', title: '用户' })
  let release
  let calls = 0
  const gate = new Promise((resolve) => {
    release = resolve
  })
  mockAdapter.onGet('/expired').reply(async () => {
    calls += 1
    await gate
    return { status: 401, data: {} }
  })
  const results = Promise.allSettled([request.get('/expired'), request.get('/expired')])
  await waitFor(() => calls === 2)
  release()
  assert.ok((await results).every((result) => result.status === 'rejected'))
  await waitFor(() => router.currentRoute.value.path === '/login')
  assert.deepEqual(notices, ['登录状态已失效，请重新登录'])
  assert.equal(replacements.length, 1)
  assert.equal(router.currentRoute.value.query.redirect, '/system/user?filter=active#row')
  assert.equal(tokenStorage.get(), null)
  assert.equal(permissions.ready, false)
  assert.equal(users.hasUserInfo, false)
  assert.equal(tabs.tabs.length, 0)
  assert.equal(views.cachedViews.length, 0)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(calls, 2)

  // HTTP 200 的业务登录失效也走同一条链路。
  await signIn('/system/operation/table?from=business#row')
  mockAdapter
    .onGet('/expired-business')
    .reply(200, { code: 10002, message: 'Token expired', data: null })
  await assert.rejects(request.get('/expired-business'))
  await waitFor(() => router.currentRoute.value.path === '/login')
  assert.equal(
    router.currentRoute.value.query.redirect,
    '/system/operation/table?from=business#row'
  )
  assert.deepEqual(notices, ['登录状态已失效，请重新登录'])

  // 新旧会话使用相同 Token 值时，迟到的旧 401 仍不能清理新会话。
  await signIn()
  let releaseOld
  let oldStarted = false
  mockAdapter.onGet('/old').reply(async () => {
    oldStarted = true
    await new Promise((resolve) => {
      releaseOld = resolve
    })
    return { status: 401, data: {} }
  })
  const oldFailure = request.get('/old').catch((error) => error)
  await waitFor(() => oldStarted)
  await signIn('/system/role')
  releaseOld()
  await oldFailure
  assert.equal(permissions.ready, true)
  assert.equal(router.currentRoute.value.path, '/system/role')
  assert.equal(notices.length, 0)
  assert.equal(replacements.length, 0)

  // 刷新页面时恢复会话失败，由守卫保留目标地址，不能发生导航死锁。
  session.clearSession()
  mockAdapter.reset()
  tokenStorage.set('expired-token')
  mockAdapter.onGet('/auth/user').reply(401, {})
  mockAdapter.onGet('/auth/routes').reply(401, {})
  await router.push('/system/operation/download?from=reload#file')
  assert.equal(router.currentRoute.value.path, '/login')
  assert.equal(
    router.currentRoute.value.query.redirect,
    '/system/operation/download?from=reload#file'
  )
  assert.deepEqual(notices, ['登录状态已失效，请重新登录'])
  assert.equal(replacements.length, 0)

  // 静默只关闭通知，不能绕过登录失效清理。
  await signIn()
  mockAdapter.onGet('/silent-expired').reply(401, {})
  await assert.rejects(request.get('/silent-expired', { context: { silentError: true } }))
  await waitFor(() => router.currentRoute.value.path === '/login')
  assert.equal(tokenStorage.get(), null)
  assert.equal(notices.length, 0)

  // 登录页初始化失败不丢失已有 redirect，也不重复提示或再次导航。
  await router.replace('/login?redirect=%2Fsystem%2Fuser%3Ftab%3Ddetail%23form')
  mockAdapter.reset()
  setupAuthMock(mockAdapter)
  mockAdapter.onGet('/auth/routes').reply(401, {})
  notices.length = 0
  replacements.length = 0
  await assert.rejects(session.signIn({ username: 'admin', password: '123456' }))
  assert.equal(router.currentRoute.value.path, '/login')
  assert.equal(router.currentRoute.value.query.redirect, '/system/user?tab=detail#form')
  assert.deepEqual(notices, ['登录状态已失效，请重新登录'])
  assert.equal(replacements.length, 0)

  console.log(
    '通过：统一错误、公共登录隔离、403、静默、取消、重试、并发 401、业务失效码、过期清理、完整回跳及旧会话隔离。'
  )
} finally {
  stop?.()
  await server.close()
}
