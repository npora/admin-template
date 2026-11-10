import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
import { createRouter, createMemoryHistory, RouterView, useRoute } from 'vue-router'
import { createTestServer, waitFor } from '../helpers/environment.mjs'

// 在 Vue 真实 Transition 中推进异步 CSS 阶段，不依赖浏览器或只测 css=false 的路径。
const mockDocument = { body: { offsetHeight: 100 } }
const node = (type) => ({
  type,
  parent: null,
  children: [],
  text: '',
  props: {},
  classes: new Set(),
  ownerDocument: mockDocument,
  get classList() {
    return {
      add: (value) => this.classes.add(value),
      remove: (value) => this.classes.delete(value)
    }
  },
  addEventListener() {},
  removeEventListener() {},
  getRootNode() {
    let root = this
    while (root.parent) root = root.parent
    return root
  }
})
function remove(child) {
  if (!child.parent) return
  const children = child.parent.children
  children.splice(children.indexOf(child), 1)
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
    target.text = text
    target.children = []
  },
  parentNode: (target) => target.parent,
  nextSibling: (target) =>
    target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _old, value) => {
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
const generated = fileURLToPath(new URL(`.check-transitions-${process.pid}.ts`, import.meta.url))
const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
await writeFile(
  generated,
  compileScript(descriptor, { id: 'check-transitions', inlineTemplate: true }).content
)
const oldWindow = globalThis.window,
  oldRaf = globalThis.requestAnimationFrame
let app, server
try {
  server = await createTestServer()
  globalThis.window = {
    getComputedStyle: (el) => ({
      transitionDelay: '0s',
      transitionDuration: [...el.classes].some((value) => value.endsWith('-active'))
        ? '0.03s'
        : '0s',
      transitionProperty: 'opacity, transform',
      animationDelay: '0s',
      animationDuration: '0s'
    })
  }
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 1)
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { default: AppMain } = await server.ssrLoadModule(
    `/tests/integration/.check-transitions-${process.pid}.ts`
  )
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useTabsStore } = await load('store/modules/tabs/index.ts')
  usePermissionStore(pinia).setReady(true)
  const instances = new Map()
  const Page = defineComponent({
    setup() {
      const path = useRoute().path
      const clicks = ref(0)
      instances.set(path, clicks)
      return () =>
        h('button', { 'data-page': path, onClick: () => clicks.value++ }, `${path}:${clicks.value}`)
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
          // 与真实配置一致：首页不缓存，管理页缓存。
          {
            path: 'dashboard',
            name: 'Dashboard',
            component: Page,
            meta: { title: '首页', fixedTab: true }
          },
          {
            path: 'users',
            name: 'Users',
            component: Page,
            meta: { title: '用户管理', keepAlive: true }
          },
          {
            path: 'roles',
            name: 'Roles',
            component: Page,
            meta: { title: '角色管理', keepAlive: true }
          }
        ]
      }
    ]
  })
  const warnings = []
  app = renderer.createApp({ render: () => h(RouterView) })
  app.config.warnHandler = (message) => warnings.push(message)
  app.use(pinia).use(router)
  await router.push('/dashboard')
  const root = node('root')
  app.mount(root)
  const flatten = (el) => [el, ...el.children.flatMap(flatten)]
  const pageButton = (path) => flatten(root).find((el) => el.props['data-page'] === path)
  const settled = () =>
    !flatten(root).some((el) =>
      [...el.classes].some((value) => /page-switch-(enter|leave)-/.test(value))
    )
  async function go(path) {
    await router.push(path)
    await nextTick()
    await waitFor(() => pageButton(path) && settled(), `页面 ${path} 应完成切换`)
    const button = pageButton(path)
    assert.equal(
      flatten(root).filter((el) => el.props['data-page']).length,
      1,
      '动画结束后不能残留旧页面'
    )
    button.props.onClick()
    await nextTick()
    assert.ok(button.text.endsWith(':1') || instances.get(path).value > 1, '页面仍应能处理点击')
  }
  await go('/dashboard')
  await go('/users')
  const users = instances.get('/users')
  await go('/dashboard')
  await go('/roles')
  await go('/users')
  assert.equal(instances.get('/users'), users, '缓存输入状态不能因动画丢失')
  await go('/dashboard')
  for (const path of ['/users', '/roles', '/dashboard', '/users', '/dashboard']) {
    await router.push(path)
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 3))
  }
  await waitFor(() => pageButton('/dashboard') && settled(), '快速切换后应正常回到首页')
  await go('/dashboard')
  await useTabsStore(pinia).refreshTab('/dashboard')
  await waitFor(() => pageButton('/dashboard') && settled(), '刷新首页后应恢复交互')
  await go('/users')
  await go('/dashboard')
  assert.deepEqual(warnings, [])
  console.log(
    '通过：真实异步过渡阶段、非缓存首页返回、缓存管理页、快速连续导航、首页刷新和页面点击。'
  )
} finally {
  app?.unmount()
  // 等待取消动画已排队的帧与回调，不让它们访问已恢复的全局环境。
  await new Promise((resolve) => setTimeout(resolve, 100))
  if (oldWindow === undefined) delete globalThis.window
  else globalThis.window = oldWindow
  if (oldRaf === undefined) delete globalThis.requestAnimationFrame
  else globalThis.requestAnimationFrame = oldRaf
  await server?.close()
  await unlink(generated)
}
