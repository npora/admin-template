import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { h, ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { node, renderer } from '../helpers/renderer.mjs'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'

for (const [kind, component, property, source] of [
  [
    'user',
    'UserFormDialog',
    'user',
    {
      id: 1,
      username: 'tester',
      displayName: 'Original',
      password: '',
      departmentId: null,
      avatar: null,
      email: null,
      mobile: null,
      status: 1,
      roleIds: [2, 1]
    }
  ],
  [
    'role',
    'RoleFormDialog',
    'role',
    { id: 1, code: 'editor', name: 'Original', description: null, status: 1, sortOrder: 0 }
  ],
  [
    'department',
    'DepartmentFormDialog',
    'department',
    {
      id: 1,
      parentId: null,
      name: 'Original',
      code: null,
      leader: null,
      phone: null,
      email: null,
      sortOrder: 0,
      status: 1
    }
  ],
  [
    'menu',
    'MenuFormDialog',
    'menu',
    {
      id: 1,
      parentId: null,
      type: 2,
      title: 'Original',
      name: 'Test',
      path: 'test',
      component: 'system/user/index',
      redirect: null,
      routeQuery: { b: 2, a: 1 },
      activeMenu: null,
      icon: null,
      permission: null,
      visible: true,
      alwaysShow: false,
      keepAlive: false,
      fixedTab: false,
      sortOrder: 0,
      status: 1
    }
  ]
]) {
  test(`${kind} real form events skip unchanged edits and cancellation, save once and ignore late validation`, async () => {
    const path = new URL(`.check-form-${kind}-${process.pid}.ts`, import.meta.url)
    const filename = fileURLToPath(
      new URL(`../../src/views/system/${kind}/components/${component}.vue`, import.meta.url)
    )
    const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
    await writeFile(path, compileScript(descriptor, { id: kind, inlineTemplate: true }).content)
    installMemoryStorage()
    const server = await createTestServer()
    let app
    try {
      const { default: Form } = await server.ssrLoadModule(
        `/tests/integration/${path.pathname.split('/').at(-1)}`
      )
      const { defineComponent } = await import('vue')
      const { i18n } = await server.ssrLoadModule('/src/locales/index.ts')
      const { usePermissionStore } = await server.ssrLoadModule(
        '/src/store/modules/permission/index.ts'
      )
      const { useManagementTable } = await server.ssrLoadModule(
        '/src/composables/useManagementTable.ts'
      )
      const pinia = createPinia()
      setActivePinia(pinia)
      usePermissionStore().setPermissions(['*'])
      usePermissionStore().setReady(true)
      const visible = ref(false),
        saving = ref(false),
        root = node('root')
      let validation = async () => true,
        writes = 0,
        loads = 0,
        lastInput
      const plain = defineComponent({
        setup:
          (_, { slots }) =>
          () =>
            h('plain', slots.default?.())
      })
      const fields = defineComponent({
        props: ['modelValue'],
        emits: ['update:modelValue'],
        setup(props, { emit }) {
          return () =>
            h('field', {
              value: props.modelValue,
              update: (value) => emit('update:modelValue', value)
            })
        }
      })
      app = renderer.createApp({
        setup() {
          const table = useManagementTable({
            permission: kind,
            list: async () => {
              loads++
              return { list: [], total: 0 }
            },
            create: async () => {
              writes++
            },
            update: async (_id, input) => {
              writes++
              lastInput = input
            },
            remove: async () => {}
          })
          return () =>
            h(Form, {
              modelValue: visible.value,
              [property]: source,
              saving: saving.value,
              roles: [],
              departments: [],
              tree: [],
              parentId: null,
              'onUpdate:modelValue': (value) => (visible.value = value),
              onSubmit: async (input) => {
                saving.value = true
                try {
                  await table.save(input, 1)
                } finally {
                  saving.value = false
                  visible.value = false
                }
              }
            })
        }
      })
      app.use(pinia).use(i18n)
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
        'ElForm',
        defineComponent({
          setup: (_, { expose, slots }) => {
            expose({ validate: () => validation(), clearValidate() {} })
            return () => h('form', slots.default?.())
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
      for (const name of ['ElInput', 'ElSelect', 'ElTreeSelect', 'ElInputNumber', 'ElSwitch'])
        app.component(name, fields)
      for (const name of [
        'ElFormItem',
        'ElRadioGroup',
        'ElRadio',
        'ElAlert',
        'ElOption',
        'ElCheckbox',
        'ElCheckboxGroup'
      ])
        app.component(name, plain)
      app.mount(root)
      const flatten = (item) => [item, ...item.children.flatMap(flatten)]
      const text = (item) => item.text + item.children.map(text).join('')
      const buttons = () =>
        flatten(root).filter((item) => item.type === 'button' && item.props.onClick)
      const save = () => buttons().at(-1).props.onClick()
      const field = (value) =>
        flatten(root).find((item) => item.type === 'field' && item.props.value === value)
      const open = async () => {
        visible.value = true
        await nextTick()
        await nextTick()
        await nextTick()
      }
      for (const action of ['cancel', 'X', 'unchanged', 'normalized']) {
        await open()
        if (action === 'cancel')
          await buttons()
            .find((item) => ['取消', 'Cancel'].includes(text(item)))
            .props.onClick()
        else if (action === 'X') await buttons()[0].props.onClick()
        else {
          if (action === 'normalized') field('Original').props.update('  Original  ')
          await save()
        }
        await nextTick()
        assert.equal(visible.value, false)
        assert.equal(writes, 0)
        assert.equal(loads, 0)
      }
      await open()
      field('Original').props.update('Changed')
      let finish
      validation = () =>
        new Promise((resolve) => {
          finish = resolve
        })
      const first = save()
      const duplicate = save()
      finish(true)
      await Promise.all([first, duplicate])
      await waitFor(() => writes === 1 && loads === 1 && !visible.value)
      assert.equal(
        kind === 'menu' ? lastInput.title : (lastInput.displayName ?? lastInput.name),
        'Changed'
      )
      await open()
      field('Original').props.update('Late')
      const late = save()
      await buttons()[0].props.onClick()
      await nextTick()
      finish(true)
      await late
      assert.equal(writes, 1, 'closed dialog must not submit when validation completes')
      assert.equal(loads, 1)
    } finally {
      app?.unmount()
      await server.close()
      await unlink(path)
    }
  })
}

test('shared submit guard resets across reopen, rejects failed validation and isolates account changes', async () => {
  installMemoryStorage()
  const server = await createTestServer()
  const { effectScope } = await import('vue')
  const scope = effectScope()
  try {
    const { useFormSubmit } = await server.ssrLoadModule('/src/composables/useFormSubmit.ts')
    const { tokenStorage } = await server.ssrLoadModule('/src/api/auth/token-storage.ts')
    const active = ref(true)
    let writes = 0,
      resolve,
      valid = true
    const form = scope.run(() =>
      useFormSubmit({
        active: () => active.value,
        editing: () => false,
        saving: () => false,
        close: () => (active.value = false),
        validate: () => (valid ? new Promise((done) => (resolve = done)) : Promise.resolve(false)),
        submit: () => {
          writes++
        }
      })
    )
    form.reset({ name: '' })
    const stale = form.submit({ name: 'old' })
    active.value = false
    await nextTick()
    active.value = true
    form.reset({ name: '' })
    const finishOld = resolve
    const fresh = form.submit({ name: '' })
    finishOld(true)
    await stale
    assert.equal(writes, 0)
    resolve(true)
    await fresh
    assert.equal(writes, 1, 'new record must submit even if it matches defaults')
    valid = false
    await form.submit({ name: 'invalid' })
    assert.equal(writes, 1)
    valid = true
    const oldAccount = form.submit({ name: 'private' })
    tokenStorage.set('new-session')
    resolve(true)
    await oldAccount
    assert.equal(writes, 1)
    const unmounted = form.submit({ name: 'unmounted' })
    scope.stop()
    resolve(true)
    await unmounted
    assert.equal(writes, 1)
  } finally {
    scope.stop()
    await server.close()
  }
})
