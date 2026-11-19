import assert from 'node:assert/strict'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createPinia } from 'pinia'
import { defineComponent, h, inject, nextTick, ref } from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'
import { node, renderer } from '../helpers/renderer.mjs'

const file = new URL(`.check-profile-sessions-${process.pid}.ts`, import.meta.url)
const bridge = new URL(`.check-profile-sessions-bridge-${process.pid}.ts`, import.meta.url)
const relative = (url) => `./${url.pathname.split('/').at(-1)}`
const root = node('root')
const renderText = (target) => target.text + target.children.map(renderText).join('')
const buttons = (target) => (target.type === 'button' ? [target] : target.children.flatMap(buttons))
const click = (text) => {
  const button = buttons(root).find((candidate) => renderText(candidate) === text)
  assert.ok(button, `Missing button: ${text}`)
  button.props.onClick()
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const current = { id: 'current-fixture', createdAt: 1000, expiresAt: 3000, current: true }
const other = { id: 'other-fixture', createdAt: 2000, expiresAt: 4000, current: false }
const state = {
  reads: [],
  confirmations: [],
  revocations: [],
  rows: [current, other],
  pendingRead: undefined
}
globalThis.__profileSessionTest = state

let app, server
installMemoryStorage()
try {
  const filename = fileURLToPath(
    new URL('../../src/views/profile/components/SessionSettings.vue', import.meta.url)
  )
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  const content = compileScript(descriptor, { id: 'profile-sessions', inlineTemplate: true })
    .content.replaceAll("from '@/api/modules/session'", `from '${relative(bridge)}'`)
    .replaceAll("from 'element-plus'", `from '${relative(bridge)}'`)
    .replace(
      "import DataTable from '@/components/DataTable/index.vue'",
      `import { DataTable } from '${relative(bridge)}'`
    )
  await writeFile(file, content)
  await writeFile(
    bridge,
    `
    import { defineComponent, h, provide } from 'vue'
    const state = globalThis.__profileSessionTest
    export const DataTable = defineComponent({
      props: ['data'],
      setup(props, { slots }) {
        provide('test-data', () => props.data)
        return () => h('table', slots.default?.())
      }
    })
    export const getOwnSessions = async signal => {
      state.reads.push(signal)
      return state.pendingRead?.promise ?? state.rows
    }
    export const revokeOwnSession = async (id, signal) => {
      state.revocations.push({ id, signal })
      state.rows = state.rows.filter(row => row.id !== id)
      return { revoked: 1 }
    }
    export const revokeOtherSessions = async signal => {
      state.revocations.push({ signal })
      state.rows = state.rows.filter(row => row.current)
      return { revoked: 1 }
    }
    export const ElMessage = { success() {} }
    export const ElMessageBox = { confirm: () => state.confirm() }
  `
  )
  state.confirm = () => {
    const decision = deferred()
    state.confirmations.push(decision)
    return decision.promise
  }
  server = await createTestServer()
  const { default: SessionSettings } = await server.ssrLoadModule(
    `/tests/integration/${file.pathname.split('/').at(-1)}`
  )
  const { i18n, applyLocale } = await server.ssrLoadModule('/src/locales/index.ts')
  const { useUserStore } = await server.ssrLoadModule('/src/store/modules/user/index.ts')
  const pinia = createPinia()
  const user = useUserStore(pinia)
  user.setUser({ id: 1, username: 'fixture-one', roles: [], permissions: [] })
  applyLocale('en-US')
  const shown = ref(true)
  app = renderer.createApp(
    defineComponent({ setup: () => () => shown.value && h(SessionSettings) })
  )
  app.use(pinia).use(i18n)
  app.component(
    'ElButton',
    defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h('button', slots.default?.())
    })
  )
  app.component('ElAlert', defineComponent({ setup: () => () => h('div') }))
  app.component(
    'ElTag',
    defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h('span', slots.default?.())
    })
  )
  app.component(
    'ElTableColumn',
    defineComponent({
      setup(_, { slots }) {
        const rows = inject('test-data')
        return () =>
          h(
            'td',
            rows().flatMap((row) => slots.default?.({ row }) ?? [])
          )
      }
    })
  )
  app.mount(root)
  await waitFor(() => renderText(root).includes('Current session'))
  assert.equal(buttons(root).filter((button) => renderText(button) === 'Sign out').length, 1)
  assert.equal(renderText(root).includes(other.id), false)

  click('Sign out other sessions')
  click('Sign out other sessions')
  assert.equal(state.confirmations.length, 1)
  await nextTick()
  state.confirmations[0].reject('cancel')
  await waitFor(
    () =>
      !buttons(root).find((button) => renderText(button) === 'Sign out other sessions').props
        .disabled
  )
  assert.equal(state.revocations.length, 0)
  assert.equal(state.reads.length, 1)

  click('Sign out')
  state.confirmations[1].resolve()
  await waitFor(() => state.reads.length === 2 && !renderText(root).includes('Other session'))
  assert.equal(state.revocations.length, 1)
  assert.equal(state.revocations[0].id, other.id)
  assert.ok(renderText(root).includes('Current session'))

  state.rows = [current, other]
  click('Refresh')
  await waitFor(() => renderText(root).includes('Other session'))
  click('Sign out other sessions')
  user.setUser({ id: 2, username: 'fixture-two', roles: [], permissions: [] })
  state.confirmations[2].resolve()
  await nextTick()
  assert.equal(state.revocations.length, 1, 'a previous account confirmation sends no write')
  await waitFor(() => state.reads.length === 4 && renderText(root).includes('Other session'))
  click('Sign out other sessions')
  state.confirmations[3].resolve()
  await waitFor(() => state.reads.length === 5 && !renderText(root).includes('Other session'))
  assert.equal(state.revocations.length, 2)
  assert.equal(state.revocations[1].id, undefined)
  assert.ok(renderText(root).includes('Current session'))

  state.pendingRead = deferred()
  click('Refresh')
  await waitFor(() => state.reads.length === 6)
  shown.value = false
  await nextTick()
  assert.equal(state.reads[5].aborted, true, 'leaving the tab aborts the pending read')
  state.pendingRead.resolve([other])
  await nextTick()
  assert.equal(renderText(root), '')

  state.pendingRead = undefined
  state.rows = [current, other]
  shown.value = true
  await waitFor(() => renderText(root).includes('Other session'))
  click('Sign out')
  shown.value = false
  await nextTick()
  state.confirmations[4].resolve()
  await nextTick()
  assert.equal(state.revocations.length, 2, 'a confirmation from a closed tab sends no write')
  console.log('通过：会话撤销确认、重复点击、保留当前会话、一次刷新和切换账号隔离。')
} finally {
  app?.unmount()
  await server?.close()
  delete globalThis.__profileSessionTest
  await Promise.all([file, bridge].map((url) => unlink(url).catch(() => {})))
}
