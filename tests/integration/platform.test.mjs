import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { createTestServer, installMemoryStorage } from '../helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer()
try {
  assert.notEqual(server.config.cacheDir, `${server.config.root}/node_modules/.vite`)
  assert.equal(server.config.optimizeDeps.noDiscovery, true)
  assert.deepEqual(server.config.optimizeDeps.include, [])
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { createDefaultSettings, resolveAppSettings } = await load('store/modules/app/config.ts')
  const defaults = createDefaultSettings()
  assert.deepEqual(defaults.theme, {
    mode: 'system',
    accent: 'indigo',
    grayscale: false,
    colorVision: false
  })
  assert.equal(defaults.layout.menuLayout, 'sidebar')
  assert.equal(defaults.layout.tabStyle, 'pill')
  assert.equal(defaults.layout.watermark, false)
  const changedDefaults = createDefaultSettings()
  changedDefaults.layout.showTabs = false
  assert.equal(defaults.layout.showTabs, true)
  for (const value of [
    null,
    1,
    'bad',
    [],
    { theme: null, layout: 'bad', componentSize: 'unknown' }
  ]) {
    assert.deepEqual(resolveAppSettings(value), defaults)
  }
  assert.deepEqual(
    resolveAppSettings({
      theme: { mode: 'wrong' },
      layout: { showLogo: false, showTabs: 'false', showBreadcrumb: true },
      componentSize: 'small'
    }),
    {
      ...defaults,
      layout: { ...defaults.layout, showLogo: false },
      componentSize: 'small'
    }
  )

  const { createBrowserStorageAdapter } = await load('utils/storage/browser.ts')
  const blocked = createBrowserStorageAdapter(() => {
    throw new Error('Storage blocked')
  })
  blocked.setItem('token', 'memory-token')
  assert.equal(blocked.getItem('token'), 'memory-token')
  assert.deepEqual(blocked.keys(), ['token'])
  blocked.removeItem('token')
  assert.equal(blocked.getItem('token'), null)
  const quota = createBrowserStorageAdapter(() => ({
    getItem: () => 'old-value',
    setItem: () => {
      throw new Error('Quota exceeded')
    }
  }))
  assert.equal(quota.getItem('key'), 'old-value')
  quota.setItem('key', 'new-value')
  assert.equal(quota.getItem('key'), 'new-value')

  const { createStorage } = await load('utils/storage/index.ts')
  const { MemoryStorageAdapter } = await load('utils/storage/memory.ts')
  const adapter = new MemoryStorageAdapter()
  const storage = createStorage(adapter, 'test_')
  adapter.setItem('test_bad', '{broken')
  assert.equal(storage.get('bad', 'default'), 'default')
  adapter.setItem('another_app', 'preserved')
  storage.set('valid', { value: 1 })
  assert.deepEqual(storage.get('valid'), { value: 1 })
  storage.clear()
  assert.equal(adapter.getItem('another_app'), 'preserved')
  assert.equal(storage.has('valid'), false)

  const { normalizeApiPrefix } = await load('config/env.ts')
  assert.equal(normalizeApiPrefix(' /api/v1/ '), '/api/v1')
  assert.equal(normalizeApiPrefix(), '/api')
  for (const value of ['/', '//example.com', 'api', '/api?key=a', '/a b']) {
    assert.throws(() => normalizeApiPrefix(value), /VITE_API_PREFIX/)
  }
  const { getLoginRedirect, joinRoutePath } = await load('router/utils/path.ts')
  assert.equal(getLoginRedirect('/system/user?filter=active#row'), '/system/user?filter=active#row')
  for (const value of [null, '//other.com', '/LOGIN/', '/%6Cogin', '/\\other.com', '/bad%']) {
    assert.equal(getLoginRedirect(value), '/')
  }
  assert.equal(joinRoutePath('/system/', 'user/'), '/system/user')
  assert.equal(joinRoutePath('/system', '/dashboard'), '/dashboard')
  const { transformDynamicRoutes } = await load('router/utils/dynamic-route.ts')
  assert.throws(
    () =>
      transformDynamicRoutes([
        {
          path: '/bad',
          name: 'Bad',
          title: 'Bad',
          component: 'system/user/components/UserFormDialog'
        }
      ]),
    /component not found/
  )

  // 没有 window/document 的环境也能读取默认主题；监听器可重复初始化并清理。
  const { getDevice } = await load('store/modules/app/responsive.ts')
  const { getSystemDarkMode } = await load('store/modules/app/theme.ts')
  assert.equal(getDevice(), 'desktop')
  assert.equal(getSystemDarkMode(), false)
  const media = new Map()
  globalThis.window = {
    matchMedia(query) {
      if (!media.has(query))
        media.set(query, {
          matches: false,
          listeners: new Set(),
          addEventListener(_type, callback) {
            this.listeners.add(callback)
          },
          removeEventListener(_type, callback) {
            this.listeners.delete(callback)
          }
        })
      return media.get(query)
    }
  }
  const { pinia } = await load('store/index.ts')
  const { useAppStore } = await load('store/modules/app/index.ts')
  const app = useAppStore(pinia)
  const classes = new Set()
  const dataset = {}
  globalThis.document = {
    documentElement: {
      dataset,
      classList: {
        toggle(name, enabled) {
          if (enabled) classes.add(name)
          else classes.delete(name)
        }
      }
    }
  }
  app.setup()
  app.setup()
  assert.equal(
    [...media.values()].reduce((count, item) => count + item.listeners.size, 0),
    2
  )
  const dark = media.get('(prefers-color-scheme: dark)')
  dark.matches = true
  dark.listeners.forEach((listener) => listener({ matches: true }))
  assert.equal(app.isDark, true)
  assert.equal(classes.has('dark'), true)
  app.setTheme('light')
  assert.equal(classes.has('dark'), false)
  app.setThemeAccent('rose')
  app.setThemeFlag('colorVision', true)
  app.setThemeFlag('grayscale', true)
  app.setMenuLayout('mixed')
  app.setTabStyle('underline')
  app.setLayoutFlag('watermark', true)
  assert.equal(dataset.npAccent, 'rose')
  assert.equal(classes.has('np-grayscale'), true)
  assert.equal(classes.has('np-color-vision'), false)
  app.setThemeFlag('grayscale', false)
  assert.equal(classes.has('np-grayscale'), false)
  assert.equal(classes.has('np-color-vision'), true)
  app.setComponentSize('small')
  app.setLayoutFlag('showTabs', false)
  app.setPageTransition('slide')
  app.setTheme('invalid')
  app.setComponentSize(true)
  app.setLayoutFlag('showTabs', 'false')
  app.setPageTransition(0)
  app.setThemeAccent('constructor')
  app.setMenuLayout('invalid')
  app.setTabStyle(null)
  app.setThemeFlag('colorVision', 0)
  app.updateSettings({
    theme: { accent: 'invalid', grayscale: 42, colorVision: null },
    layout: { menuLayout: 0, tabStyle: undefined, watermark: 'false' },
    componentSize: 'invalid'
  })
  app.restoreSettings()
  assert.equal(app.settings.theme.mode, 'light')
  assert.equal(app.settings.componentSize, 'small')
  assert.equal(app.settings.layout.showTabs, false)
  assert.equal(app.settings.layout.pageTransition, 'slide')
  assert.deepEqual(app.settings.theme, {
    mode: 'light',
    accent: 'rose',
    grayscale: false,
    colorVision: true
  })
  assert.equal(app.settings.layout.menuLayout, 'mixed')
  assert.equal(app.settings.layout.tabStyle, 'underline')
  assert.equal(app.settings.layout.watermark, true)
  app.resetSettings()
  assert.deepEqual(app.settings, defaults)
  assert.equal(dataset.npAccent, 'indigo')
  assert.equal(classes.has('np-color-vision'), false)
  app.restoreSettings()
  assert.deepEqual(app.settings, defaults)
  delete globalThis.document
  app.dispose()
  assert.equal(
    [...media.values()].reduce((count, item) => count + item.listeners.size, 0),
    0
  )
  delete globalThis.window

  // 权限指令在挂载前生效，后续权限与 binding 变化只更新已有监听器。
  const { permission } = await load('directives/permission/permission.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const permissions = usePermissionStore(pinia)
  const element = { style: { display: 'inline-flex' } }
  permission.beforeMount(element, { value: 'write', modifiers: {} })
  assert.equal(element.style.display, 'none')
  permissions.setPermissions(['write'])
  permissions.setReady(true)
  await nextTick()
  assert.equal(element.style.display, 'inline-flex')
  permission.updated(element, { value: ['write', 'delete'], modifiers: { all: true } })
  await nextTick()
  assert.equal(element.style.display, 'none')
  permissions.setPermissions(['*'])
  await nextTick()
  assert.equal(element.style.display, 'inline-flex')
  permission.beforeUnmount(element)
  permissions.reset()
  await nextTick()
  assert.equal(element.style.display, 'inline-flex')

  console.log(
    '通过：设置校验、存储降级与隔离、站内回跳、页面入口白名单、媒体监听清理及权限指令更新。'
  )
} finally {
  await server.close()
}
