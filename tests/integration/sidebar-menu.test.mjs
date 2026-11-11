import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  ElMenu,
  ElMenuItem,
  ElSubMenu,
  ElIcon,
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY
} from 'element-plus'
import { parse, compileScript } from 'vue/compiler-sfc'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createTestServer } from '../helpers/environment.mjs'

const generated = new URL(`.check-sidebar-menu-${process.pid}.ts`, import.meta.url)
let server
try {
  const filename = fileURLToPath(
    new URL('../../src/layout/components/AppMenuItem/index.vue', import.meta.url)
  )
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  await writeFile(
    generated,
    compileScript(descriptor, { id: 'test-sidebar-menu', inlineTemplate: true }).content
  )
  server = await createTestServer()
  const { default: AppMenuItem } = await server.ssrLoadModule(
    `/tests/integration/.check-sidebar-menu-${process.pid}.ts`
  )
  const item = {
    path: '/system',
    title: '系统管理',
    children: [
      {
        path: '/system/access',
        title: '权限管理',
        children: [{ path: '/system/role', title: '角色管理' }]
      }
    ]
  }
  const render = (activePath, menu = item) => {
    const app = createSSRApp({
      render: () =>
        h(ElMenu, { collapse: true, defaultActive: activePath }, () =>
          h(AppMenuItem, { item: menu, activePath })
        )
    })
    app.provide(ID_INJECTION_KEY, { prefix: 1, current: 0 })
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    app.component('ElSubMenu', ElSubMenu)
    app.component('ElMenuItem', ElMenuItem)
    app.component('ElIcon', ElIcon)
    return renderToString(app)
  }

  // A collapsed submenu's lazy children have not mounted during SSR.
  // The current branch must still be identified from its descendant path.
  const active = await render('/system/role')
  assert.match(active, /is-current-branch/)
  assert.match(active, /aria-label="系统管理"/)
  assert.match(active, /<svg/)
  assert.doesNotMatch(await render('/profile'), /is-current-branch/)
  assert.doesNotMatch(await render('/system/role-other'), /is-current-branch/)
  const leaf = await render('/other', { path: '/other', title: 'Other', icon: 'unknown-icon' })
  assert.match(leaf, /aria-label="Other"/)
  assert.match(leaf, /<svg/)
  console.log('通过：折叠菜单在子项未挂载时仍标记当前分组，且保留无障碍名称和缺省图标。')
} finally {
  if (server) await server.close()
  await unlink(generated).catch(() => {})
}
