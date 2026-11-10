import { createTestServer } from '../helpers/environment.mjs'
import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createRenderer, defineComponent, h, nextTick, ref, onUnmounted } from 'vue'
import { createRouter, createMemoryHistory, RouterView, useRoute } from 'vue-router'

// 用 Vue 的真实渲染器和 KeepAlive 验证实例生命周期，无需浏览器或额外测试依赖。
const node = (type) => ({
  type,
  parent: null,
  children: [],
  text: '',
  props: {},
  getRootNode() {
    let root = this
    while (root.parent) root = root.parent
    return root
  }
})
function remove(child) {
  if (!child.parent) return
  const siblings = child.parent.children
  siblings.splice(siblings.indexOf(child), 1)
  child.parent = null
}
const renderer = createRenderer({
  remove,
  createElement: node,
  createText: (text) => ({ ...node('text'), text }),
  createComment: (text) => ({ ...node('comment'), text }),
  setText: (target, text) => {
    target.text = text
  },
  setElementText: (target, text) => {
    target.children.forEach((child) => {
      child.parent = null
    })
    target.children = []
    target.text = text
  },
  parentNode: (target) => target.parent,
  nextSibling: (target) => {
    const siblings = target.parent?.children ?? []
    return siblings[siblings.indexOf(target) + 1] ?? null
  },
  patchProp: (target, key, _previous, value) => {
    target.props[key] = value
  },
  insert: (child, parent, anchor = null) => {
    remove(child)
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    child.parent = parent
  }
})

const filename = fileURLToPath(
  new URL('../../src/layout/components/AppMain/index.vue', import.meta.url)
)
const generatedPath = fileURLToPath(new URL(`.check-app-main-${process.pid}.ts`, import.meta.url))
const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
const compiled = compileScript(descriptor, { id: 'check-app-main', inlineTemplate: true })
await writeFile(generatedPath, compiled.content)
let server
let app
try {
  server = await createTestServer()
  const { default: AppMain } = await server.ssrLoadModule(
    `/tests/integration/.check-app-main-${process.pid}.ts`
  )
  const { pinia } = await server.ssrLoadModule('/src/store/index.ts')
  const { useViewsStore } = await server.ssrLoadModule('/src/store/modules/views/index.ts')
  const { useTabsStore } = await server.ssrLoadModule('/src/store/modules/tabs/index.ts')
  const { usePermissionStore } = await server.ssrLoadModule(
    '/src/store/modules/permission/index.ts'
  )
  usePermissionStore(pinia).setReady(true)
  const views = useViewsStore(pinia)
  const tabs = useTabsStore(pinia)
  const instances = new Map()
  const unmounted = new Set()
  let nextInstance = 0
  const Page = defineComponent({
    // 故意让组件名与路由名不一致，并让两个参数路径共用组件。
    name: 'SharedPage',
    setup() {
      const path = useRoute().path
      const instance = { id: ++nextInstance, value: ref('') }
      instances.set(path, instance)
      onUnmounted(() => unmounted.add(instance.id))
      return () => h('input', { value: instance.value.value })
    }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'Layout',
        component: AppMain,
        children: [
          {
            path: 'dashboard',
            name: 'Dashboard',
            component: Page,
            meta: { title: '首页', fixedTab: true, keepAlive: true }
          },
          {
            path: 'users/:id',
            name: 'UserDetail',
            component: Page,
            meta: { title: '用户', keepAlive: true }
          },
          { path: 'plain', name: 'Plain', component: Page, meta: { title: '普通页' } },
          {
            path: 'hidden',
            name: 'Hidden',
            component: Page,
            meta: { title: '隐藏页', hidden: true, keepAlive: true }
          }
        ]
      }
    ]
  })
  const go = async (path) => {
    await router.push(path)
    await nextTick()
  }
  await go('/users/1?from=deep')
  app = renderer.createApp({ render: () => h(RouterView) })
  const warnings = []
  app.config.warnHandler = (message) => warnings.push(message)
  app.use(pinia).use(router)
  app.mount(node('root'))
  await nextTick()
  assert.equal(
    tabs.tabs.some((tab) => tab.path === '/dashboard' && tab.fixed),
    true
  )
  await go('/dashboard')

  // 整个检查不挂载 AppTabs，模拟隐藏标签栏和移动端的共同情况。
  await go('/users/1?filter=active#form')
  const first = instances.get('/users/1')
  first.value.value = '保留的输入'
  await go('/plain')
  const plain = instances.get('/plain')
  await go('/users/1?filter=disabled#details')
  assert.equal(instances.get('/users/1'), first)
  assert.equal(first.value.value, '保留的输入')
  assert.equal(
    tabs.tabs.find((tab) => tab.path === '/users/1').fullPath,
    '/users/1?filter=disabled#details'
  )
  assert.equal(tabs.tabs.filter((tab) => tab.path === '/users/1').length, 1)
  assert.equal(unmounted.has(plain.id), true)

  await go('/users/2')
  const second = instances.get('/users/2')
  second.value.value = '另一个用户'
  await go('/dashboard')
  tabs.removeTab('/users/1')
  await nextTick()
  assert.equal(unmounted.has(first.id), true)
  await go('/users/2')
  assert.equal(instances.get('/users/2'), second)
  assert.equal(second.value.value, '另一个用户')
  await go('/users/1')
  assert.notEqual(instances.get('/users/1').id, first.id)
  assert.equal(instances.get('/users/1').value.value, '')

  const beforeRefresh = instances.get('/users/1')
  const refresh = tabs.refreshTab('/users/1')
  await Promise.all([refresh, tabs.refreshTab('/users/1')])
  assert.equal(views.getViewVersion('/users/1'), 1)
  await nextTick()
  assert.equal(unmounted.has(beforeRefresh.id), true)
  assert.notEqual(instances.get('/users/1').id, beforeRefresh.id)
  await go('/users/2')
  assert.equal(instances.get('/users/2'), second)
  // 刷新非当前页面后再次访问也必须是新实例。
  await tabs.refreshTab('/users/1')
  const lastFirst = instances.get('/users/1')
  await go('/users/1')
  assert.notEqual(instances.get('/users/1').id, lastFirst.id)

  await go('/hidden')
  const hidden = instances.get('/hidden')
  hidden.value.value = '隐藏页状态'
  assert.equal(
    tabs.tabs.some((tab) => tab.path === '/hidden'),
    false
  )
  await go('/dashboard')
  await go('/hidden')
  assert.equal(instances.get('/hidden'), hidden)
  assert.equal(hidden.value.value, '隐藏页状态')

  await go('/users/2')
  tabs.removeOtherTabs('/users/2')
  await nextTick()
  assert.equal(unmounted.has(hidden.id), true)
  assert.deepEqual(
    tabs.tabs.map((tab) => tab.path),
    ['/dashboard', '/users/2']
  )
  assert.equal(tabs.removeTab('/dashboard'), false)
  await go('/dashboard')
  tabs.removeAllTabs()
  await nextTick()
  assert.deepEqual(
    views.views.map((view) => view.path),
    ['/dashboard']
  )
  assert.equal(unmounted.has(second.id), true)

  await go('/users/1')
  const activeClosed = instances.get('/users/1')
  tabs.removeTab('/users/1')
  await go('/dashboard')
  await go('/users/1')
  const reopened = instances.get('/users/1')
  assert.notEqual(reopened.id, activeClosed.id)
  await go('/dashboard')
  await go('/users/1')
  assert.equal(instances.get('/users/1'), reopened)
  await go('/dashboard')

  // 刷新与会话清理并发时，旧任务不能污染重建后的同路径页面。
  const pending = tabs.refreshTab('/dashboard')
  tabs.clear()
  views.trackView('/dashboard', true)
  const newName = views.getViewName('/dashboard')
  await pending
  assert.deepEqual(views.cachedViews, [newName])
  assert.equal(views.getViewVersion('/dashboard'), 0)
  await nextTick()
  const rebuilt = instances.get('/dashboard')
  rebuilt.value.value = '新会话状态'
  await go('/plain')
  await go('/dashboard')
  assert.equal(instances.get('/dashboard'), rebuilt)
  assert.equal(rebuilt.value.value, '新会话状态')
  tabs.clear()
  await nextTick()
  assert.equal(views.cachedViews.length, 0)
  assert.equal(views.views.length, 0)
  assert.equal(tabs.tabs.length, 0)
  assert.deepEqual(warnings, [])
  console.log(
    '通过：无标签栏缓存、组件名独立、参数路径隔离、query/hash 记录、关闭淘汰、当前/后台刷新、隐藏页、批量关闭与清理竞态。'
  )
} finally {
  try {
    app?.unmount()
  } finally {
    await server?.close()
    await unlink(generatedPath)
  }
}
