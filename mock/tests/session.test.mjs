import {
  createTestServer,
  installMemoryStorage,
  createStubRouter
} from '../../tests/helpers/environment.mjs'
import assert from 'node:assert/strict'

installMemoryStorage()
const server = await createTestServer({ mock: true })

try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { constantRoutes } = await load('router/routes/constant.ts')
  // 这里验证导航和会话，不挂载页面组件。
  const stub = { render: () => null }
  const router = createStubRouter(constantRoutes)

  const { useSession } = await load('composables/useSession.ts')
  const { setupAuthGuard } = await load('router/guards/auth.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useTabsStore } = await load('store/modules/tabs/index.ts')
  const { pinia } = await load('store/index.ts')
  const { mockAdapter } = await server.ssrLoadModule('/mock/index.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { checkPermission } = await load('utils/permission.ts')
  const { registerDynamicRoutes } = await load('router/utils/register-routes.ts')
  const { transformDynamicRoutes } = await load('router/utils/dynamic-route.ts')
  const { createMenuTree } = await load('router/utils/menu.ts')
  const session = useSession(router)
  const permissions = usePermissionStore(pinia)
  const tabs = useTabsStore(pinia)
  setupAuthGuard(router)

  await router.push('/system/operation/download?from=test#section')
  assert.equal(router.currentRoute.value.path, '/login')
  assert.equal(
    router.currentRoute.value.query.redirect,
    '/system/operation/download?from=test#section'
  )

  await assert.rejects(session.signIn({ username: 'admin', password: 'wrong' }))
  assert.equal(tokenStorage.get(), null)
  await session.signIn({ username: 'admin', password: '123456' })
  assert.equal(permissions.ready, true)
  assert.equal(router.hasRoute('SystemUser'), true)
  assert.deepEqual(
    permissions.menus.map((menu) => menu.path),
    ['/dashboard', '/system', '/examples/form']
  )
  assert.equal(checkPermission(permissions.permissions, 'system:user:create'), true)
  assert.equal(checkPermission([], 'system:user:create'), false)

  // 替换 Token 后必须重建权限与动态路由，而不是复用旧 ready 状态。
  tokenStorage.set('npora-mock-viewer-token')
  assert.equal(await session.initialize(), true)
  assert.equal(router.hasRoute('SystemRole'), false)
  assert.deepEqual(permissions.permissions, ['system:user:list'])
  tokenStorage.set('npora-mock-access-token')
  assert.equal(await session.initialize(), true)
  assert.equal(router.hasRoute('SystemRole'), true)

  await router.push(router.currentRoute.value.query.redirect)
  assert.equal(router.currentRoute.value.name, 'SystemDownload')
  assert.equal(router.currentRoute.value.query.from, 'test')
  assert.equal(router.currentRoute.value.hash, '#section')
  await router.push('/system/operation')
  assert.equal(router.currentRoute.value.name, 'SystemDownload')

  // 旧静态业务路由不再绕过后端菜单。
  await router.push('/user')
  assert.equal(router.currentRoute.value.name, 'RouteFallback')
  tabs.addTab({ path: '/system/user', name: 'SystemUser', title: '用户', keepAlive: true })
  await session.logout()
  assert.equal(permissions.ready, false)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(tabs.tabs.length, 0)
  assert.deepEqual(
    permissions.menus.map((menu) => menu.path),
    ['/dashboard', '/examples/form']
  )

  // 退出同时撤销服务端 Token；重新登录才能继续模拟刷新。
  const { getUserInfo } = await load('api/modules/auth.ts')
  tokenStorage.set('npora-mock-access-token')
  await assert.rejects(getUserInfo(), /登录状态已失效/)
  await session.signIn({ username: 'admin', password: '123456' })
  // 模拟带 Token 刷新深层地址，必须重新匹配到加载后的路由。
  session.clearSession()
  tokenStorage.set('npora-mock-access-token')
  await router.push('/system/operation/table?from=reload#row')
  assert.equal(router.currentRoute.value.name, 'SystemTable')
  assert.equal(router.currentRoute.value.query.from, 'reload')
  assert.equal(router.currentRoute.value.hash, '#row')
  await router.push('/login')
  assert.equal(router.currentRoute.value.path, '/dashboard')

  // 冲突必须在注册前失败，不能覆盖已有路由。
  assert.throws(
    () => registerDynamicRoutes(router, [{ path: '/other', name: 'Dashboard', component: stub }]),
    /Duplicate route name/
  )
  assert.throws(
    () => registerDynamicRoutes(router, [{ path: '/dashboard', name: 'Other', component: stub }]),
    /Duplicate route path/
  )
  assert.throws(
    () =>
      transformDynamicRoutes([{ path: '/bad', title: 'bad', name: 'Bad', component: '../bad' }]),
    /Invalid dynamic route component/
  )
  assert.equal(router.hasRoute('Dashboard'), true)

  const menu = createMenuTree(
    transformDynamicRoutes([
      {
        path: '/parent',
        title: '目录',
        children: [
          {
            path: 'child',
            name: 'Child',
            title: '子页',
            component: 'examples/cache/index',
            routeQuery: { id: 1 }
          }
        ]
      }
    ])
  )[0]
  assert.equal(menu.path, '/parent/child')
  assert.deepEqual(menu.routeQuery, { id: 1 })

  // 初始化并发去重；退出时不接受仍在途中的接口结果。
  session.clearSession()
  tokenStorage.set('npora-mock-access-token')
  mockAdapter.resetHandlers()
  mockAdapter
    .onGet('/auth/user')
    .reply(200, { code: 0, data: { id: 1, displayName: 'Admin', roles: [], permissions: [] } })
  let release
  let calls = 0
  mockAdapter.onGet('/auth/routes').reply(async () => {
    calls += 1
    await new Promise((resolve) => {
      release = resolve
    })
    return { status: 200, data: { code: 0, message: 'success', data: [] } }
  })
  const first = session.initialize()
  const second = session.initialize()
  assert.equal(first, second)
  const deadline = Date.now() + 3000
  while (!release && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(release, '延迟请求应在三秒内开始')
  session.clearSession()
  release()
  assert.equal(await first, false)
  assert.equal(calls, 1)
  assert.equal(permissions.ready, false)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(tokenStorage.get(), null)

  // 用户信息成功、路由接口失败时，也必须清理整个会话。
  mockAdapter.resetHandlers()
  mockAdapter
    .onGet('/auth/user')
    .reply(200, { code: 0, data: { id: 1, displayName: 'Admin', roles: [], permissions: [] } })
  mockAdapter
    .onGet('/auth/routes')
    .reply(200, { code: 10002, message: '路由权限已失效', data: null })
  tokenStorage.set('npora-mock-access-token')
  await assert.rejects(session.initialize(), /路由权限已失效/)
  assert.equal(permissions.ready, false)
  assert.equal(tokenStorage.get(), null)
  assert.equal(router.hasRoute('SystemUser'), false)

  console.log(
    '通过：登录/回跳、动态菜单、多级目录、刷新重匹配、退出清理、路由冲突、权限、初始化并发与过期请求。'
  )
} finally {
  await server.close()
}
