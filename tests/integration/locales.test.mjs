import assert from 'node:assert/strict'
import localizedPattern from 'dayjs'
import fs from 'node:fs'
import { computed, effectScope, nextTick } from 'vue'
import { createPinia } from 'pinia'
import {
  createTestServer,
  createStubRouter,
  installMemoryStorage
} from '../helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer()
const originalDocument = globalThis.document
const scope = effectScope()
let stopTitle
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { i18nConfig } = await load('config/i18n.ts')
  const { localeRegistry, registeredLocales } = await load('locales/registry.ts')
  const { useUserStore } = await load('store/modules/user/index.ts')
  const { resolveInitialLocale } = await load('locales/policy.ts')
  const { i18n, applyLocale, formatDate, formatNumber, formatList, translateRouteTitle } =
    await load('locales/index.ts')
  const { useLocaleStore } = await load('store/modules/locale.ts')
  const { useLocale } = await load('composables/useLocale.ts')
  const { localStorageService } = await load('utils/storage/index.ts')
  const { STORAGE_KEYS } = await load('constants/storage.ts')
  const { SYSTEM_STATUS_OPTIONS } = await load('constants/system.ts')
  const { MENU_TYPE_OPTIONS } = await load('constants/menu.ts')
  const { translateErrorMessage } = await load('locales/errors.ts')
  const { setupTitleGuard } = await load('router/guards/title.ts')

  const config = { ...i18nConfig }
  assert.equal(resolveInitialLocale(config, 'en-US'), 'en-US')
  for (const bad of [null, 'fr-FR', {}, 'en', '<script>'])
    assert.equal(resolveInitialLocale(config, bad), 'zh-CN')
  assert.equal(resolveInitialLocale({ ...config, enabled: false }, 'en-US', ['en-US']), 'zh-CN')
  assert.equal(
    resolveInitialLocale(
      { ...config, supportedLocales: ['en-US'], defaultLocale: 'en-US', fallbackLocale: 'en-US' },
      'zh-CN'
    ),
    'en-US'
  )
  assert.equal(
    resolveInitialLocale({ ...config, detectBrowserLanguage: true }, null, ['fr', 'en-GB']),
    'en-US'
  )
  assert.equal(
    resolveInitialLocale({ ...config, detectBrowserLanguage: true }, 'zh-CN', ['en-US']),
    'zh-CN'
  )
  assert.throws(
    () => resolveInitialLocale({ ...config, supportedLocales: [] }, null),
    /defaultLocale/
  )
  assert.throws(
    () =>
      resolveInitialLocale(
        { ...config, supportedLocales: ['zh-CN'], fallbackLocale: 'en-US' },
        null
      ),
    /fallbackLocale/
  )

  globalThis.document = { title: '', documentElement: { lang: '' } }
  const store = useLocaleStore(createPinia())
  const { elementLocale, localeLabel, localeOptions } = scope.run(() => useLocale())
  const userStore = useUserStore(createPinia())
  const translated = computed(() => i18n.global.t('ui.userManagement'))
  const formatted = computed(() => formatDate('2026-11-09T15:05:06'))
  store.restoreLocale()
  assert.equal(store.locale, 'zh-CN')
  assert.equal(document.documentElement.lang, 'zh-CN')
  assert.equal(elementLocale.value.name, 'zh-cn')
  assert.equal(translated.value, '用户管理')
  assert.equal(userStore.displayName, '用户')
  assert.equal(localeLabel.value, '简体中文')
  assert.equal(i18n.global.t('ui.unassignedDepartment'), '未分配部门')
  assert.equal(formatted.value, '2026-11-09 15:05')
  assert.match(formatDate('2026-11-09', 'heading'), /11月|十一月/)
  assert.equal(SYSTEM_STATUS_OPTIONS[0].label, '启用')
  assert.equal(MENU_TYPE_OPTIONS[0].label, '目录')

  const router = createStubRouter([
    { path: '/dashboard', name: 'Dashboard', component: {}, meta: { title: '首页' } }
  ])
  stopTitle = setupTitleGuard(router)
  await router.push('/dashboard')
  assert.match(document.title, /^首页 - /)
  assert.equal(store.setLocale('en-US'), true)
  await nextTick()
  assert.equal(translated.value, 'User management')
  assert.equal(userStore.displayName, 'User')
  assert.equal(localeLabel.value, 'English')
  assert.equal(i18n.global.t('ui.unassignedDepartment'), 'Unassigned department')
  assert.equal(formatList(['Alice', 'Bob']), 'Alice, Bob')
  assert.equal(
    i18n.global.t('ui.greetingWithName', { value: 'Hello', value1: 'Alice' }),
    'Hello, Alice'
  )
  for (const count of [0, 1, 2]) {
    const unit = count === 1 ? 'user' : 'users'
    assert.equal(i18n.global.t('ui.userUnit', count), unit)
    assert.equal(i18n.global.t('ui.userCountUnit', count), unit)
    assert.equal(
      i18n.global.t('ui.usersCanSignIn', { value: count }, count),
      `${count} ${unit} can sign in`
    )
    assert.equal(
      i18n.global.t('ui.usersInTotal', { value: count }, count),
      `${count} ${unit} in total`
    )
  }
  assert.equal(i18n.global.t('ui.metricUserUnit'), '')
  assert.equal(formatted.value, 'Nov 9, 2026 3:05 PM')
  assert.equal(document.documentElement.lang, 'en-US')
  assert.equal(elementLocale.value.name, 'en')
  assert.equal(localizedPattern.locale(), 'en')
  assert.equal(localizedPattern('2026-11-09').format('LL'), 'November 9, 2026')
  assert.equal(SYSTEM_STATUS_OPTIONS[0].label, 'Enabled')
  assert.equal(MENU_TYPE_OPTIONS[0].label, 'Directory')
  assert.match(document.title, /^Dashboard - /)
  assert.equal(translateRouteTitle('用户管理', 'SystemUser'), 'Users')
  assert.equal(translateRouteTitle('系统管理'), 'System management')
  assert.equal(translateRouteTitle('操作示例'), 'Examples')
  assert.equal(translateRouteTitle('下载示例', 'SystemDownload'), 'Downloads')
  assert.equal(translateRouteTitle('客户工作台', 'SystemUser'), '客户工作台')
  assert.equal(translateRouteTitle('自定义菜单', 'Unknown'), '自定义菜单')
  assert.equal(
    translateErrorMessage('登录状态已失效，请重新登录'),
    'Your session expired. Sign in again.'
  )
  assert.equal(translateErrorMessage('业务校验详情'), '业务校验详情')
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate('invalid'), '—')
  assert.equal(formatNumber(12345), '12,345')
  assert.equal(formatDate('2026-11-09T15:05:06', 'time'), '3:05:06 PM')

  assert.equal(localStorageService.get(STORAGE_KEYS.LOCALE), 'en-US')
  store.resetLocale()
  assert.equal(store.locale, 'zh-CN')
  assert.equal(localStorageService.get(STORAGE_KEYS.LOCALE), null)
  store.setLocale('en-US')
  const reloadedStore = useLocaleStore(createPinia())
  applyLocale('zh-CN')
  reloadedStore.restoreLocale()
  assert.equal(reloadedStore.locale, 'en-US')
  assert.equal(store.setLocale('unknown'), false)
  assert.equal(store.locale, 'en-US')
  i18nConfig.enabled = false
  store.restoreLocale()
  assert.equal(store.locale, 'zh-CN')
  assert.equal(store.setLocale('en-US'), false)
  i18nConfig.enabled = true
  store.restoreLocale()
  assert.equal(store.locale, 'en-US')
  localStorageService.set(STORAGE_KEYS.LOCALE, { bad: 'en-US' })
  store.restoreLocale()
  assert.equal(store.locale, 'zh-CN')

  // Check every registered language rather than maintaining another hard-coded locale list.
  const root = new URL('../../', import.meta.url)
  const namespaces = Object.keys(localeRegistry['zh-CN'].messages)
  const resources = Object.fromEntries(
    registeredLocales.map((locale) => [
      locale,
      Object.fromEntries(
        namespaces.map((namespace) => [
          namespace,
          JSON.parse(fs.readFileSync(new URL(`src/locales/${locale}/${namespace}.json`, root)))
        ])
      )
    ])
  )
  const baseline = resources['zh-CN']
  const params = (text) =>
    [...new Set([...text.matchAll(/\{([a-zA-Z]\w*)\}/g)].map((match) => match[1]))].sort()
  const warns = [],
    originalWarn = console.warn,
    originalError = console.error
  console.warn = (message) => warns.push(message)
  console.error = (message) => warns.push(message)
  try {
    for (const locale of registeredLocales) {
      const definition = localeRegistry[locale]
      applyLocale(locale)
      assert.equal(elementLocale.value, definition.elementLocale)
      assert.equal(localeLabel.value, definition.label)
      assert.equal(localeOptions.find((option) => option.value === locale).label, definition.label)
      assert.equal(localizedPattern.locale(), definition.dayjsLocale)
      assert.equal(
        formatDate('2026-11-09T15:05:06'),
        localizedPattern('2026-11-09T15:05:06')
          .locale(definition.dayjsLocale)
          .format(definition.dateFormats.dateTime)
      )
      for (const namespace of namespaces) {
        assert.deepEqual(
          Object.keys(resources[locale][namespace]).sort(),
          Object.keys(baseline[namespace]).sort(),
          `${locale}/${namespace}`
        )
        for (const [key, text] of Object.entries(resources[locale][namespace])) {
          assert.deepEqual(
            params(text),
            params(baseline[namespace][key]),
            `${locale}/${namespace}.${key}`
          )
          const args = Object.fromEntries(params(text).map((name) => [name, 'Example']))
          const result = i18n.global.t(`${namespace}.${key}`, args)
          assert.equal(typeof result, 'string')
          assert.notEqual(result, `${namespace}.${key}`, key)
        }
      }
    }
  } finally {
    console.warn = originalWarn
    console.error = originalError
  }
  assert.deepEqual(warns, [], 'Messages must compile without missing keys or syntax errors')

  // Avoid stale dictionary entries after UI removal and missing entries in new frontend code.
  const references = new Set()
  function collectReferences(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'locales') continue
      const filename = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
      if (entry.isDirectory()) collectReferences(filename)
      else if (/\.(ts|vue)$/.test(entry.name)) {
        const source = fs.readFileSync(filename, 'utf8')
        for (const match of source.matchAll(/['"`]ui\.([a-zA-Z0-9_]+)['"`]/g))
          references.add(match[1])
      }
    }
  }
  collectReferences(new URL('src/', root))
  assert.deepEqual(
    [...references].filter((key) => !(key in baseline.ui)),
    [],
    'Frontend references must exist'
  )
  assert.deepEqual(
    Object.keys(baseline.ui).filter((key) => !references.has(key)),
    [],
    'Remove unused UI keys'
  )

  i18n.global.mergeLocaleMessage('zh-CN', { ui: { fallbackTest: '回退词条' } })
  assert.equal(
    i18n.global.t(
      'ui.fallbackTest',
      {},
      { locale: 'en-US', missingWarn: false, fallbackWarn: false }
    ),
    '回退词条'
  )
  stopTitle()
  stopTitle = undefined
  const stoppedTitle = document.title
  applyLocale('zh-CN')
  assert.equal(document.title, stoppedTitle)
  console.log(
    '通过：语言配置/关闭开关、偏好恢复、浏览器检测、响应式文案、Element Plus、Day.js、日期与数字格式、菜单及标题联动、翻译词条完整性和错误提示。'
  )
} finally {
  stopTitle?.()
  scope.stop()
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
  await server.close()
}
