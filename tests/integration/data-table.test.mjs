import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
import { createTestServer } from '../helpers/environment.mjs'

// Compile the actual client templates and mount with Element Plus boundary stubs.
// This tests wrapper behavior without depending on browser layout or an HTTP service.
const node = (type) => ({ type, parent: null, children: [], props: {}, text: '' })
function remove(child) {
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
const generated = [
  new URL(`.check-data-table-${process.pid}.ts`, import.meta.url),
  new URL(`.check-table-pagination-${process.pid}.ts`, import.meta.url)
]
let server, app
try {
  for (const [index, name] of ['DataTable', 'TablePagination'].entries()) {
    const filename = fileURLToPath(
      new URL(`../../src/components/${name}/index.vue`, import.meta.url)
    )
    const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
    const content = compileScript(descriptor, { id: `test-${name}`, inlineTemplate: true })
      .content.replace(
        '@/components/TablePagination/index.vue',
        `./.check-table-pagination-${process.pid}.ts`
      )
      .replace("from './types'", "from '../../src/components/DataTable/types'")
    await writeFile(generated[index], content)
  }
  server = await createTestServer()
  const { default: DataTable } = await server.ssrLoadModule(
    `/tests/integration/.check-data-table-${process.pid}.ts`
  )
  const rows = ref([{ id: 1, children: [{ id: 2 }] }])
  const loading = ref(false),
    disabled = ref(false),
    pagination = ref(true),
    border = ref(true),
    size = ref('small')
  const page = ref(2),
    pageSize = ref(20),
    reference = ref()
  let nativeProps, nativeEmit, paginationProps, paginationEmit
  let clearCalls = 0,
    layoutCalls = 0,
    pageCalls = 0,
    sizeCalls = 0
  const selections = [],
    sorts = [],
    clicks = []
  const StubTable = defineComponent({
    props: ['data', 'border', 'rowKey', 'size', 'treeProps', 'defaultSort', 'defaultExpandAll'],
    emits: ['selection-change', 'sort-change', 'row-click'],
    setup(props, { attrs, slots, emit, expose }) {
      nativeProps = () => ({ ...props, ...attrs })
      nativeEmit = emit
      expose({
        clearSelection: () => {
          clearCalls++
        },
        doLayout: () => {
          layoutCalls++
        }
      })
      return () =>
        h('native-table', {}, [
          slots.default?.(),
          !props.data.length && slots.empty?.(),
          slots.append?.()
        ])
    }
  })
  const StubPagination = defineComponent({
    props: ['currentPage', 'pageSize', 'total', 'disabled'],
    emits: ['update:current-page', 'update:page-size'],
    setup(props, { emit }) {
      paginationProps = () => props
      paginationEmit = emit
      return () => h('native-pagination')
    }
  })
  const defaultSort = { prop: 'id', order: 'descending' }
  const treeProps = { children: 'children' }
  const root = node('root')
  app = renderer.createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            DataTable,
            {
              ref: reference,
              data: rows.value,
              loading: loading.value,
              pagination: pagination.value,
              paginationDisabled: disabled.value,
              border: border.value,
              page: page.value,
              pageSize: pageSize.value,
              total: 100,
              class: 'dashboard-users',
              style: { color: 'red' },
              size: size.value,
              treeProps,
              defaultSort,
              defaultExpandAll: true,
              'onUpdate:page': (value) => {
                pageCalls++
                page.value = value
              },
              'onUpdate:pageSize': (value) => {
                sizeCalls++
                pageSize.value = value
              },
              onSelectionChange: (value) => selections.push(value),
              onSortChange: (value) => sorts.push(value),
              onRowClick: (value) => clicks.push(value)
            },
            {
              default: () => h('column-slot', {}, 'columns'),
              empty: () => h('empty-slot', {}, 'custom-empty'),
              append: () => h('append-slot', {}, 'footer')
            }
          )
      }
    })
  )
  app.component('ElTable', StubTable)
  app.component('ElPagination', StubPagination)
  app.component('ElEmpty', defineComponent({ render: () => h('empty-default') }))
  app.directive('loading', {})
  app.mount(root)
  await nextTick()
  assert.equal(nativeProps().border, true)
  assert.equal(nativeProps().rowKey, 'id')
  assert.equal(nativeProps().defaultExpandAll, true)
  assert.equal(nativeProps().treeProps, treeProps)
  assert.equal(nativeProps().defaultSort, defaultSort)
  assert.equal(nativeProps().size, 'small')
  assert.equal(nativeProps().class, undefined)
  assert.equal(root.children[0].props.class, 'data-table dashboard-users')
  assert.equal(paginationProps().currentPage, 2)
  assert.equal(paginationProps().pageSize, 20)
  assert.equal(paginationProps().total, 100)
  nativeEmit('selection-change', rows.value)
  const sort = { column: {}, prop: 'id', order: 'ascending' }
  nativeEmit('sort-change', sort)
  nativeEmit('row-click', rows.value[0])
  assert.equal(selections.length, 1)
  assert.equal(selections[0], rows.value)
  assert.deepEqual(sorts, [sort])
  assert.equal(clicks.length, 1)
  reference.value.clearSelection()
  reference.value.doLayout()
  assert.equal(typeof reference.value.getTable().clearSelection, 'function')
  assert.equal(clearCalls, 1)
  assert.equal(layoutCalls, 1)
  paginationEmit('update:current-page', 3)
  paginationEmit('update:page-size', 50)
  await nextTick()
  assert.equal(page.value, 3)
  assert.equal(pageSize.value, 50)
  assert.equal(pageCalls, 1)
  assert.equal(sizeCalls, 1)
  assert.equal(paginationProps().currentPage, 3)
  loading.value = true
  await nextTick()
  assert.equal(paginationProps().disabled, true)
  loading.value = false
  disabled.value = true
  size.value = 'large'
  border.value = false
  rows.value = []
  await nextTick()
  assert.equal(paginationProps().disabled, true)
  assert.equal(nativeProps().size, 'large', 'native attrs must refresh after density changes')
  assert.equal(nativeProps().border, false)
  const contains = (target, type) =>
    target.type === type || target.children.some((child) => contains(child, type))
  assert.ok(contains(root, 'column-slot'))
  assert.ok(contains(root, 'empty-slot'))
  assert.ok(contains(root, 'append-slot'))
  pagination.value = false
  await nextTick()
  assert.equal(contains(root, 'native-pagination'), false)
  console.log(
    '通过：共享表格与分页的属性、树形/排序透传、列与空状态插槽、事件去重、实例方法、加载禁用及按需分页。'
  )
} finally {
  app?.unmount()
  if (server) await server.close()
  await Promise.all(generated.map((path) => unlink(path).catch(() => {})))
}
