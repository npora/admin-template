import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createRenderer, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'

// Mount the real page, drawer and form templates; stub only UI and HTTP boundaries.
const node = (type) => ({ type, parent: null, children: [], props: {}, text: '' })
const remove = (child) => {
  if (!child.parent) return
  const siblings = child.parent.children
  siblings.splice(siblings.indexOf(child), 1)
  child.parent = null
}
const renderer = createRenderer({
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
  remove,
  insert: (child, parent, anchor = null) => {
    remove(child)
    const position = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(position < 0 ? parent.children.length : position, 0, child)
    child.parent = parent
  }
})
const id = process.pid
const pathFor = (name) => new URL(`.check-dict-${name}-${id}.ts`, import.meta.url)
const files = ['boundaries', 'page', 'items', 'form'].map(pathFor)
let server, app
try {
  await writeFile(
    pathFor('boundaries'),
    `
import { computed, defineComponent, h, inject, provide } from 'vue'
export const calls = { types: 0, items: 0, updateType: 0, updateItem: 0, createType: 0 }
const type = { id: 1, name: 'Notice', code: 'sys_notice_type', remark: null, status: 1, sortOrder: 0, itemCount: 1 }
const item = { id: 1, dictTypeId: 1, label: 'Message', value: 'message', tagType: 'primary', remark: null, status: 1, sortOrder: 0 }
export async function getDictTypes() { calls.types++; return { list: [{ ...type }], total: 1 } }
export async function getDictItems() { calls.items++; return { list: [{ ...item }], total: 1 } }
export async function updateDictType(_id, input) { calls.updateType++; Object.assign(type, input); return { ...type } }
export async function updateDictItem(_type, _id, input) { calls.updateItem++; Object.assign(item, input); return { ...item } }
export async function createDictType() { calls.createType++ }
export async function createDictItem() {}
export async function deleteDictType() {}
export async function deleteDictItem() {}
export const ElMessage = { success() {} }
export const ElMessageBox = { confirm: async () => {} }
export const TableToolbar = defineComponent({ setup: (_, { slots }) => () => h('toolbar', slots.default?.()) })
export const DataTable = defineComponent({
  props: ['data'], setup(props, { slots }) {
    provide('rows', computed(() => props.data))
    return () => h('table-stub', slots.default?.())
  }
})
const plain = defineComponent({ setup: (_, { slots }) => () => h('ui-stub', slots.default?.()) })
const modal = (name) => defineComponent({
  props: ['modelValue', 'title'], emits: ['update:modelValue', 'closed'],
  setup(props, { slots, emit }) {
    return () => props.modelValue ? h('modal-stub', { title: props.title }, [
      h('button', { onClick: () => { emit('update:modelValue', false); emit('closed') } }, 'Close ' + name),
      slots.default?.(), slots.footer?.()
    ]) : null
  }
})
export const components = {
  ElDialog: modal('editor'), ElDrawer: modal('drawer'),
  ElButton: defineComponent({ setup: (_, { attrs, slots }) => () => h('button', attrs, slots.default?.()) }),
  ElInput: defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], setup(props, { emit }) {
    return () => h('field', { value: props.modelValue, update: (value) => emit('update:modelValue', value) })
  }}),
  ElForm: defineComponent({ setup: (_, { expose, slots }) => {
    expose({ validate: async () => true, clearValidate() {} })
    return () => h('form-stub', slots.default?.())
  }}),
  ElTableColumn: defineComponent({ props: ['prop'], setup(props, { slots }) {
    const rows = inject('rows')
    return () => h('column-stub', rows.value.map((row) => slots.default ? slots.default({ row }) : h('span', String(row[props.prop] ?? ''))))
  }}),
  ElFormItem: plain, ElSelect: plain, ElOption: plain, ElInputNumber: plain,
  ElRadioGroup: plain, ElRadio: plain, ElTag: plain, ElAlert: plain, ElEmpty: plain, ElResult: plain
}
`
  )
  for (const [name, relative] of [
    ['page', 'index.vue'],
    ['items', 'components/DictionaryItems.vue'],
    ['form', 'components/DictionaryForm.vue']
  ]) {
    const filename = fileURLToPath(
      new URL(`../../src/views/system/dict/${relative}`, import.meta.url)
    )
    const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
    const boundary = `./.check-dict-boundaries-${id}.ts`
    const content = compileScript(descriptor, { id: `dict-${name}`, inlineTemplate: true })
      .content.replaceAll("'element-plus'", `'${boundary}'`)
      .replace(/import 'element-plus\/[^']+'\n/g, '')
      .replace(/import DataTable from '[^']+'/g, `import { DataTable } from '${boundary}'`)
      .replace(/import TableToolbar from '[^']+'/g, `import { TableToolbar } from '${boundary}'`)
      .replace("'@/api/modules/dict'", `'${boundary}'`)
      .replace(/'(?:\.\/components\/|\.\/)DictionaryForm.vue'/g, `'./.check-dict-form-${id}.ts'`)
      .replace("'./components/DictionaryItems.vue'", `'./.check-dict-items-${id}.ts'`)
      .replace(
        /'(?:\.\/|\.\.\/)useDictionaryTable'/g,
        "'../../src/views/system/dict/useDictionaryTable'"
      )
    await writeFile(pathFor(name), content)
  }
  installMemoryStorage()
  server = await createTestServer()
  const load = (name) => server.ssrLoadModule(`/tests/integration/.check-dict-${name}-${id}.ts`)
  const { default: Page } = await load('page')
  const { calls, components } = await load('boundaries')
  const { i18n, applyLocale } = await server.ssrLoadModule('/src/locales/index.ts')
  applyLocale('zh-CN')
  const { usePermissionStore } = await server.ssrLoadModule(
    '/src/store/modules/permission/index.ts'
  )
  const pinia = createPinia()
  setActivePinia(pinia)
  const permission = usePermissionStore(pinia)
  permission.setReady(true)
  permission.setPermissions(['*'])
  app = renderer.createApp({ render: () => h(Page) })
  app.use(pinia).use(i18n)
  app.directive('permission', {})
  for (const [name, component] of Object.entries(components)) app.component(name, component)
  const root = node('root')
  app.mount(root)
  const flatten = (el) => [el, ...el.children.flatMap(flatten)]
  const text = (el) => el.text + el.children.map(text).join('')
  const click = async (label, last = false) => {
    const matches = flatten(root).filter((el) => el.type === 'button' && text(el) === label)
    const button = last ? matches.at(-1) : matches[0]
    assert.ok(button, `Missing button: ${label}`)
    await button.props.onClick()
    await nextTick()
  }
  const field = (value) =>
    flatten(root).find((el) => el.type === 'field' && el.props.value === value)
  await waitFor(() => calls.types === 1 && field('Notice') === undefined)
  await nextTick()
  const initial = { ...calls }
  await click('编辑')
  await click('取消')
  assert.deepEqual(calls, initial, 'cancelling type edit must not update or reload')
  await click('编辑')
  await click('Close editor')
  assert.deepEqual(calls, initial, 'closing type edit must not update or reload')
  await click('编辑')
  await click('保存')
  assert.deepEqual(calls, initial, 'saving unchanged type must close without requests')
  await click('编辑')
  field('Notice').props.update(' Notice ')
  await nextTick()
  await click('保存')
  assert.deepEqual(calls, initial, 'normalized unchanged values must not update')
  await click('编辑')
  field('Notice').props.update('Renamed')
  await nextTick()
  await click('保存')
  assert.equal(calls.updateType, 1)
  assert.equal(calls.types, 2, 'successful save refreshes the type list once')
  await click('字典数据')
  await waitFor(() => calls.items === 1)
  await nextTick()
  const opened = { ...calls }
  await click('编辑', true)
  await click('取消')
  assert.deepEqual(calls, opened, 'cancelling item edit must not refresh either list')
  await click('编辑', true)
  await click('保存')
  assert.deepEqual(calls, opened, 'unchanged item save must not update or refresh')
  await click('Close drawer')
  assert.deepEqual(calls, opened, 'closing an unchanged drawer must not reload types')
  await click('字典数据')
  await waitFor(() => calls.items === 2)
  await nextTick()
  await click('编辑', true)
  field('Message').props.update('New message')
  await nextTick()
  await click('保存')
  await waitFor(() => calls.types === 3)
  await nextTick()
  assert.equal(calls.updateItem, 1)
  assert.equal(calls.items, 3)
  assert.equal(calls.types, 3, 'item save updates the parent summary once')
  await click('Close drawer')
  assert.equal(calls.types, 3, 'closing after save must not repeat the parent refresh')
  console.log(
    '通过：类型和数据编辑取消/关闭/无改动保存不发请求；实际保存只刷新一次，关闭抽屉不重复刷新。'
  )
} finally {
  app?.unmount()
  await server?.close()
  await Promise.all(files.map((file) => unlink(file).catch(() => {})))
}
