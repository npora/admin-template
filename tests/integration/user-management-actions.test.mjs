import assert from 'node:assert/strict'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createPinia } from 'pinia'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'
import { renderer, node } from '../helpers/renderer.mjs'

const files = ['page', 'bridge'].map(
  (name) => new URL(`.check-user-actions-${name}-${process.pid}.ts`, import.meta.url)
)
let app, server, config, previousEnabled
installMemoryStorage()
try {
  const filename = fileURLToPath(new URL('../../src/views/system/user/index.vue', import.meta.url))
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  const bridge = `./${files[1].pathname.split('/').at(-1)}`
  let source = compileScript(descriptor, { id: 'user-actions', inlineTemplate: true }).content
  for (const [name, path] of [
    ['DataTable', '@/components/DataTable/index.vue'],
    ['TableToolbar', '@/components/TableToolbar/index.vue'],
    ['UserFormDialog', './components/UserFormDialog.vue'],
    ['AuthenticatorSettings', '@/components/AuthenticatorSettings/index.vue']
  ])
    source = source.replace(`import ${name} from '${path}'`, `import { ${name} } from '${bridge}'`)
  for (const path of ['./useUserManagement', '@/composables/useSession', 'element-plus'])
    source = source.replaceAll(`from '${path}'`, `from '${bridge}'`)
  source = source.replace("import 'element-plus/es/components/message-box/style/css'", '')
  await writeFile(files[0], source)
  await writeFile(
    files[1],
    `
    import {defineComponent,h} from 'vue'
    const f=globalThis.__userActions
    export const useUserManagement=()=>f.state
    export const useSession=()=>({logout:async()=>{}})
    export const ElMessage={success(){}}
    export const ElMessageBox={confirm:async()=>{},prompt:async()=>{throw 'cancel'}}
    export const DataTable=defineComponent({setup:(_, {slots})=>()=>h('table',slots.default?.())})
    export const TableToolbar=defineComponent({render:()=>h('toolbar')})
    export const UserFormDialog=defineComponent({render:()=>h('user-form')})
    export const AuthenticatorSettings=defineComponent({props:['targetUser'],emits:['changed','close'],setup:(p,{emit})=>()=>h('authenticator',{targetId:p.targetUser.id,change:()=>emit('changed'),close:()=>emit('close')})})
  `
  )
  const row = {
    id: 2,
    username: 'viewer',
    displayName: 'Viewer',
    avatar: null,
    email: null,
    mobile: null,
    roles: [],
    isSuperAdmin: false,
    status: 1,
    authenticatorEnabled: false,
    createdAt: 0
  }
  let loads = 0
  const state = {
    roleOptions: ref([]),
    departments: ref([]),
    optionsLoading: ref(false),
    filters: ref({}),
    query: ref({ page: 1, pageSize: 10 }),
    rows: ref([row]),
    total: ref(1),
    loading: ref(false),
    loadFailed: ref(false),
    saving: ref(false),
    deletingId: ref(),
    load: async () => {
      loads++
    },
    loadOptions: async () => true
  }
  for (const name of ['search', 'reset', 'changePage', 'changePageSize', 'save', 'remove'])
    state[name] = () => {}
  globalThis.__userActions = { state }
  server = await createTestServer()
  const { default: Page } = await server.ssrLoadModule(
    `/tests/integration/${files[0].pathname.split('/').at(-1)}`
  )
  const { i18n } = await server.ssrLoadModule('/src/locales/index.ts')
  const { useUserStore } = await server.ssrLoadModule('/src/store/modules/user/index.ts')
  config = (await server.ssrLoadModule('/src/config/auth.ts')).authConfig
  previousEnabled = config.authenticatorEnabled
  config.authenticatorEnabled = true
  const pinia = createPinia()
  useUserStore(pinia).setUser({
    id: 1,
    username: 'admin',
    isSuperAdmin: true,
    roles: [],
    permissions: ['*']
  })
  const { usePermissionStore } = await server.ssrLoadModule(
    '/src/store/modules/permission/index.ts'
  )
  const permission = usePermissionStore(pinia)
  permission.permissions = ['*']
  permission.ready = true
  app = renderer.createApp(Page)
  app.use(pinia).use(i18n)
  const plain = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('plain', slots.default?.())
  })
  for (const name of [
    'ElForm',
    'ElFormItem',
    'ElInput',
    'ElTreeSelect',
    'ElSelect',
    'ElOption',
    'ElTag',
    'ElAvatar',
    'ElIcon',
    'ElDropdownMenu',
    'ElDropdownItem',
    'ElAlert',
    'ElResult',
    'ElEmpty'
  ])
    app.component(name, plain)
  app.component(
    'ElButton',
    defineComponent({
      props: ['disabled'],
      setup:
        (props, { slots }) =>
        () =>
          h('button', { disabled: props.disabled }, slots.default?.())
    })
  )
  app.component(
    'ElTableColumn',
    defineComponent({
      props: ['label'],
      setup:
        (props, { slots }) =>
        () =>
          h('column', { label: props.label }, slots.default?.({ row }))
    })
  )
  app.component(
    'ElDropdown',
    defineComponent({
      emits: ['command'],
      setup:
        (_, { slots, emit }) =>
        () =>
          h('dropdown', { command: (value) => emit('command', value) }, [
            slots.default?.(),
            slots.dropdown?.()
          ])
    })
  )
  app.component(
    'ElDialog',
    defineComponent({
      emits: ['close'],
      setup:
        (_, { slots, emit }) =>
        () =>
          h('dialog', { close: () => emit('close') }, slots.default?.())
    })
  )
  app.directive('permission', {})
  const root = node('root')
  app.mount(root)
  const all = (target, type) => [
    ...(target.type === type ? [target] : []),
    ...target.children.flatMap((child) => all(child, type))
  ]
  const text = (target) => target.text + target.children.map(text).join('')
  await waitFor(() => loads === 1)
  const identity = all(root, 'column').find((column) => column.props.label === '用户')
  assert.ok(
    !text(identity).includes('重置密码'),
    'identity column must contain only identity information'
  )
  const actions = all(root, 'column').find((column) => column.props.label === '操作')
  assert.ok(text(actions).includes('重置密码'))
  assert.ok(text(actions).includes('管理验证器'))
  all(root, 'dropdown')[0].props.command('authenticator')
  await nextTick()
  assert.equal(all(root, 'authenticator')[0].props.targetId, 2)
  all(root, 'dialog')[0].props.close()
  await nextTick()
  assert.equal(all(root, 'dialog').length, 0)
  assert.equal(loads, 1, 'closing without saving must not refresh the list')
  all(root, 'dropdown')[0].props.command('authenticator')
  await nextTick()
  all(root, 'authenticator')[0].props.change()
  await nextTick()
  assert.equal(
    all(root, 'dialog').length,
    1,
    'keep the one-time key visible after successful creation'
  )
  assert.equal(loads, 2, 'successful binding refreshes exactly once')
  all(root, 'authenticator')[0].props.close()
  await nextTick()
  assert.equal(all(root, 'dialog').length, 0)
  assert.equal(loads, 2, 'finishing must not refresh again')
  console.log('通过：用户列无密码操作、更多菜单正确传递目标账号、关闭不刷新、保存只刷新一次。')
} finally {
  app?.unmount()
  if (config) config.authenticatorEnabled = previousEnabled
  await server?.close()
  delete globalThis.__userActions
  await Promise.all(files.map((file) => unlink(file).catch(() => {})))
}
