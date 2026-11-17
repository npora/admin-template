import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { defineComponent, h, nextTick, ref } from 'vue'
import { node, renderer } from '../helpers/renderer.mjs'
import { createTestServer } from '../helpers/environment.mjs'

const generated = new URL(`.check-date-range-${process.pid}.ts`, import.meta.url)
let server, app
try {
  const filename = fileURLToPath(
    new URL('../../src/components/DateRangePicker/index.vue', import.meta.url)
  )
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  const content = compileScript(descriptor, { id: 'date-range', inlineTemplate: true })
    .content.replace("from './model'", "from '@/components/DateRangePicker/model'")
    .replace("import { ElMessage } from 'element-plus'", 'const ElMessage = { warning() {} }')
  await writeFile(generated, content)
  server = await createTestServer()
  const { default: DateRangePicker } = await server.ssrLoadModule(
    `/tests/integration/.check-date-range-${process.pid}.ts`
  )
  const { applyTimeZone } = await server.ssrLoadModule('/src/utils/datetime.ts')
  const { i18n } = await server.ssrLoadModule('/src/locales/index.ts')
  const value = ref([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 1, 1)])
  const updates = [],
    changes = [],
    invalid = []
  let nativeProps, nativeEmit
  const Stub = defineComponent({
    props: ['modelValue', 'type', 'format', 'valueFormat', 'showNow', 'disabled'],
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
      nativeProps = () => props
      nativeEmit = emit
      return () => h('date-picker')
    }
  })
  applyTimeZone('UTC')
  app = renderer.createApp(
    defineComponent({
      setup: () => () =>
        h(DateRangePicker, {
          modelValue: value.value,
          disabled: true,
          'onUpdate:modelValue': (next) => {
            updates.push(next)
            value.value = next
          },
          onChange: (next) => changes.push(next),
          onInvalid: () => invalid.push(true)
        })
    })
  )
  app.use(i18n)
  app.component('ElDatePicker', Stub)
  app.mount(node('root'))
  assert.equal(nativeProps().type, 'datetimerange')
  assert.equal(nativeProps().disabled, true)
  assert.equal(nativeProps().showNow, false)
  assert.deepEqual(nativeProps().modelValue, ['2026-01-01 00:00:00.000', '2026-01-01 01:00:00.000'])
  applyTimeZone('Asia/Shanghai')
  await nextTick()
  assert.deepEqual(nativeProps().modelValue, ['2026-01-01 08:00:00.000', '2026-01-01 09:00:00.000'])
  assert.equal(updates.length, 0, 'timezone changes must not modify the submitted range')
  assert.equal(changes.length, 0)
  const selected = ['2026-01-02 08:00:00.123', '2026-01-02 09:00:00.456']
  nativeEmit('update:modelValue', selected)
  nativeEmit('change', selected)
  await nextTick()
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0], [
    Date.UTC(2026, 0, 2, 0, 0, 0, 123),
    Date.UTC(2026, 0, 2, 1, 0, 0, 456)
  ])
  assert.deepEqual(changes, updates)
  applyTimeZone('America/New_York')
  await nextTick()
  const nonexistent = ['2026-03-08 02:30:00.000', '2026-03-08 03:30:00.000']
  nativeEmit('update:modelValue', nonexistent)
  nativeEmit('change', nonexistent)
  await nextTick()
  assert.equal(invalid.length, 1)
  assert.equal(updates.length, 1, 'nonexistent local times must preserve the previous range')
  assert.equal(changes.length, 1)
  nativeEmit('update:modelValue', null)
  nativeEmit('change', null)
  await nextTick()
  assert.equal(value.value, null)
  assert.deepEqual(updates, [updates[0], null])
  assert.deepEqual(changes, updates)
  console.log(
    '通过：真实日期区间组件切换时区不发请求、选择和清空事件仅一次、返回毫秒并拒绝夏令时无效时间。'
  )
} finally {
  app?.unmount()
  if (server) await server.close()
  await unlink(generated).catch(() => {})
}
