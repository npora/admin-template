import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { h, ref, nextTick, defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { node, renderer } from '../helpers/renderer.mjs'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'

test('real grant tree closes without writes for unchanged sets and saves changed selections once', async () => {
  const file = new URL(`.check-grant-${process.pid}.ts`, import.meta.url)
  const boundary = new URL(`.check-grant-api-${process.pid}.ts`, import.meta.url)
  const filename = fileURLToPath(
    new URL('../../src/views/system/role/components/RoleGrantDialog.vue', import.meta.url)
  )
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  await writeFile(
    boundary,
    `
export let writes = 0, reads = 0, saved
export const ElMessage = { success() {} }
export async function getRoleMenuOptions() { reads++; return [{ id: 1, title: 'Page', type: 2 }] }
export async function getRoleMenus() { return [2, 1] }
let finish
export const complete = () => finish()
export function grantRoleMenus(_id, ids) { writes++; saved = ids; return new Promise(resolve => finish = resolve) }
`
  )
  await writeFile(
    file,
    compileScript(descriptor, { id: 'grant', inlineTemplate: true })
      .content.replaceAll("'element-plus'", `'./${boundary.pathname.split('/').at(-1)}'`)
      .replace("'@/api/modules/role'", `'./${boundary.pathname.split('/').at(-1)}'`)
  )
  installMemoryStorage()
  const server = await createTestServer()
  let app
  try {
    const api = await server.ssrLoadModule(
      `/tests/integration/${boundary.pathname.split('/').at(-1)}`
    )
    const { default: Form } = await server.ssrLoadModule(
      `/tests/integration/${file.pathname.split('/').at(-1)}`
    )
    const { i18n } = await server.ssrLoadModule('/src/locales/index.ts')
    const { usePermissionStore } = await server.ssrLoadModule(
      '/src/store/modules/permission/index.ts'
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    usePermissionStore().setPermissions(['*'])
    usePermissionStore().setReady(true)
    const visible = ref(false),
      root = node('root')
    app = renderer.createApp({
      render: () =>
        h(Form, {
          modelValue: visible.value,
          role: { id: 1, name: 'Editor' },
          'onUpdate:modelValue': (value) => (visible.value = value)
        })
    })
    app.use(pinia).use(i18n)
    app.directive('loading', {})
    app.component(
      'ElDialog',
      defineComponent({
        props: ['modelValue'],
        emits: ['update:modelValue'],
        setup(props, { slots, emit }) {
          return () =>
            props.modelValue
              ? h('modal', [
                  h('button', { onClick: () => emit('update:modelValue', false) }, 'X'),
                  slots.default?.(),
                  slots.footer?.()
                ])
              : null
        }
      })
    )
    app.component(
      'ElButton',
      defineComponent({
        setup:
          (_, { attrs, slots }) =>
          () =>
            h('button', attrs, slots.default?.())
      })
    )
    app.component(
      'ElAlert',
      defineComponent({
        setup:
          (_, { slots }) =>
          () =>
            h('alert', slots.default?.())
      })
    )
    app.component(
      'ElTree',
      defineComponent({
        setup: (_, { expose }) => {
          let ids = []
          expose({ setCheckedKeys: (value) => (ids = value), getCheckedKeys: () => ids })
          return () => h('tree', { select: (value) => (ids = value) })
        }
      })
    )
    app.mount(root)
    const flatten = (item) => [item, ...item.children.flatMap(flatten)]
    const buttons = () => flatten(root).filter((item) => item.type === 'button')
    const save = () => buttons().at(-1).props.onClick()
    const open = async () => {
      visible.value = true
      await waitFor(() => buttons().at(-1)?.props.disabled === false)
      await nextTick()
    }
    await open()
    await buttons()[0].props.onClick()
    await nextTick()
    assert.equal(api.writes, 0)
    await open()
    flatten(root)
      .find((item) => item.type === 'tree')
      .props.select([1, 2])
    await save()
    await nextTick()
    assert.equal(visible.value, false, 'selection order alone is not a modification')
    assert.equal(api.writes, 0)
    await open()
    flatten(root)
      .find((item) => item.type === 'tree')
      .props.select([1])
    const first = save(),
      duplicate = save()
    assert.equal(api.writes, 1)
    assert.deepEqual(api.saved, [1])
    api.complete()
    await Promise.all([first, duplicate])
    assert.equal(visible.value, false)
    assert.equal(api.writes, 1)
    assert.equal(api.reads, 3, 'closing and saving must not reload the tree')
  } finally {
    app?.unmount()
    await server.close()
    await Promise.all([unlink(file), unlink(boundary)])
  }
})
