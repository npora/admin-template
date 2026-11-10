import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { createMemoryHistory, createRouter } from 'vue-router'

export function installMemoryStorage() {
  class MemoryStorage {
    values = new Map()
    get length() {
      return this.values.size
    }
    getItem(key) {
      return this.values.get(key) ?? null
    }
    setItem(key, value) {
      this.values.set(String(key), String(value))
    }
    removeItem(key) {
      this.values.delete(key)
    }
    clear() {
      this.values.clear()
    }
    key(index) {
      return [...this.values.keys()][index] ?? null
    }
  }
  globalThis.localStorage = new MemoryStorage()
  globalThis.sessionStorage = new MemoryStorage()
}

/** 仅用 Vite 转换真实源码，不打开浏览器、不监听 HTTP 或 WebSocket 端口。 */
export async function createTestServer({ demo = false } = {}) {
  const previousDemo = process.env.VITE_DEMO_ENABLED
  // 测试实例不能写开发服务的 node_modules/.vite，否则浏览器会请求过期的预构建依赖。
  const cacheDir = await mkdtemp(join(tmpdir(), 'npora-admin-tests-'))
  process.env.VITE_DEMO_ENABLED = String(demo)
  try {
    const server = await createServer({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      cacheDir,
      mode: 'development',
      plugins: [
        {
          name: 'disable-test-client-optimizer',
          config(config) {
            // 配置合并会拼接 include 数组，在钩子中清空开发环境的预构建列表。
            config.optimizeDeps = { ...config.optimizeDeps, noDiscovery: true, include: [] }
          }
        }
      ],
      server: { middlewareMode: true, hmr: false, ws: false, watch: null, open: false }
    })
    const close = server.close.bind(server)
    server.close = async () => {
      try {
        await close()
      } finally {
        await rm(cacheDir, { recursive: true, force: true })
      }
    }
    return server
  } catch (error) {
    await rm(cacheDir, { recursive: true, force: true })
    throw error
  } finally {
    if (previousDemo === undefined) delete process.env.VITE_DEMO_ENABLED
    else process.env.VITE_DEMO_ENABLED = previousDemo
  }
}

export function createStubRouter(routes) {
  const stub = { render: () => null }
  const stubRoutes = (items) =>
    items.map((route) => ({
      ...route,
      ...('component' in route ? { component: stub } : {}),
      ...(route.children ? { children: stubRoutes(route.children) } : {})
    }))
  const router = createRouter({ history: createMemoryHistory(), routes: stubRoutes(routes) })
  const addRoute = router.addRoute.bind(router)
  router.addRoute = (parent, route) =>
    typeof parent === 'object'
      ? addRoute(stubRoutes([parent])[0])
      : addRoute(parent, stubRoutes([route])[0])
  return router
}

export async function waitFor(predicate, message = '异步操作应在三秒内完成') {
  const deadline = Date.now() + 3000
  while (!predicate() && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(predicate(), message)
}
