import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { defineComponent, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'
import { renderer, node } from '../helpers/renderer.mjs'

const componentFile = new URL(`.check-authenticator-${process.pid}.ts`, import.meta.url)
const bridgeFile = new URL(`.check-authenticator-bridge-${process.pid}.ts`, import.meta.url)
let app, server
installMemoryStorage()
try {
  const filename = fileURLToPath(
    new URL('../../src/views/profile/components/AuthenticatorSettings.vue', import.meta.url)
  )
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  const bridge = `./${bridgeFile.pathname.split('/').at(-1)}`
  const content = compileScript(descriptor, { id: 'authenticator', inlineTemplate: true })
    .content.replaceAll("from '@/api/modules/auth'", `from '${bridge}'`)
    .replaceAll("from '@/composables/useSession'", `from '${bridge}'`)
    .replaceAll("from 'element-plus'", `from '${bridge}'`)
  await writeFile(componentFile, content)
  await writeFile(
    bridgeFile,
    `
    const calls = globalThis.__nporaAuthenticatorTest
    export const getAuthenticatorStatus = async () => ({ available: true, enabled: false })
    export const setupAuthenticator = (...args) => calls.setup(...args)
    export const enableAuthenticator = async (...args) => { calls.enabled.push(args) }
    export const disableAuthenticator = async () => {}
    export const useSession = () => ({ logout: async () => { calls.logouts++ } })
    export const ElMessage = { success: () => {} }
  `
  )
  const calls = { enabled: [], logouts: 0, setups: [], setup: undefined }
  globalThis.__nporaAuthenticatorTest = calls
  server = await createTestServer()
  const { default: Settings } = await server.ssrLoadModule(
    `/tests/integration/${componentFile.pathname.split('/').at(-1)}`
  )
  const { i18n } = await server.ssrLoadModule('/src/locales/index.ts')
  const { useUserStore } = await server.ssrLoadModule('/src/store/modules/user/index.ts')
  const pinia = createPinia()
  setActivePinia(pinia)
  const user = useUserStore()
  user.setUser({ id: 1, username: 'first', roles: [], permissions: [] })
  const root = node('root')
  app = renderer.createApp(Settings)
  app.use(pinia).use(i18n)
  const plain = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('plain', slots.default?.())
  })
  for (const name of ['ElAlert', 'ElTag', 'ElFormItem']) app.component(name, plain)
  app.component(
    'ElForm',
    defineComponent({
      emits: ['submit'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('form', { onSubmit: () => emit('submit', { preventDefault() {} }) }, slots.default?.())
    })
  )
  app.component(
    'ElButton',
    defineComponent({
      props: ['nativeType', 'disabled'],
      setup:
        (props, { slots }) =>
        () =>
          h('button', { disabled: props.disabled }, slots.default?.())
    })
  )
  app.component(
    'ElInput',
    defineComponent({
      props: ['modelValue', 'readonly'],
      emits: ['update:modelValue'],
      setup:
        (props, { emit }) =>
        () =>
          h('input', {
            value: props.modelValue,
            readonly: props.readonly,
            update: (value) => emit('update:modelValue', value)
          })
    })
  )
  app.directive('loading', {})
  app.mount(root)
  const all = (target, type) => [
    ...(target.type === type ? [target] : []),
    ...target.children.flatMap((child) => all(child, type))
  ]
  await waitFor(() => all(root, 'form').length === 1)
  let resolveSetup
  calls.setup = (password, signal) => {
    calls.setups.push({ password, signal })
    return new Promise((resolve) => {
      resolveSetup = resolve
    })
  }
  all(root, 'input')[0].props.update('current-password')
  await nextTick()
  all(root, 'form')[0].props.onSubmit()
  all(root, 'form')[0].props.onSubmit()
  assert.equal(calls.setups.length, 1, 'duplicate form submission creates only one setup request')
  user.setUser({ id: 2, username: 'second', roles: [], permissions: [] })
  await nextTick()
  assert.equal(calls.setups[0].signal.aborted, true)
  resolveSetup({ secret: 'OLD-ACCOUNT-SECRET', uri: 'old' })
  await waitFor(() => all(root, 'input')[0]?.props.value === '')
  await nextTick()
  assert.equal(
    all(root, 'input').length,
    1,
    'late setup response must not expose the previous account secret'
  )
  calls.setup = async () => ({ secret: 'NEW-ACCOUNT-SECRET', uri: 'new' })
  all(root, 'input')[0].props.update('second-password')
  await nextTick()
  all(root, 'form')[0].props.onSubmit()
  await waitFor(() => all(root, 'input').length === 3)
  all(root, 'input')[2].props.update('123456')
  await nextTick()
  all(root, 'form')[0].props.onSubmit()
  all(root, 'form')[0].props.onSubmit()
  await waitFor(() => calls.logouts === 1)
  assert.equal(calls.enabled.length, 1)
  assert.deepEqual(calls.enabled[0].slice(0, 2), ['second-password', '123456'])
  assert.equal(
    all(root, 'input')[0].props.value,
    '',
    'password cleared after changing security settings'
  )
  console.log(
    '通过：真实验证器表单事件防重复提交、账号切换取消请求、迟到密钥不泄露及启用成功后退出。'
  )
} finally {
  app?.unmount()
  await server?.close()
  delete globalThis.__nporaAuthenticatorTest
  await Promise.all([componentFile, bridgeFile].map((file) => unlink(file).catch(() => {})))
}
