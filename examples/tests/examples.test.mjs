import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { createPinia } from 'pinia'
import {
  createTestServer,
  installMemoryStorage,
  createStubRouter
} from '../../tests/helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer({ demo: true })
const scopes = []
const scoped = (factory) => {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(factory)
}
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { buildCsv } = await server.ssrLoadModule('/examples/utils/csv.ts')
  const csv = buildCsv(
    [{ label: 'Value', value: (row) => row.value }],
    [
      { value: 'a,"b"\nc' },
      { value: '=SUM(1,2)' },
      { value: '  @cmd' },
      { value: -12 },
      { value: null }
    ]
  )
  assert.ok(csv.startsWith('\uFEFF"Value"\r\n'))
  assert.ok(csv.includes('"a,""b""\nc"'))
  assert.ok(csv.includes('"\'=SUM(1,2)"'))
  assert.ok(csv.includes('"\'  @cmd"'))
  assert.ok(csv.includes('"-12"'))

  const { usePaginatedTable } = await load('composables/usePaginatedTable.ts')
  const requests = []
  const list = scoped(() =>
    usePaginatedTable({
      filters: () => ({ keyword: '' }),
      fetcher: (query, signal) =>
        new Promise((resolve, reject) => requests.push({ query, signal, resolve, reject }))
    })
  )
  const first = list.load()
  list.filters.keyword = 'new'
  const second = list.search()
  assert.equal(requests[0].signal.aborted, true)
  requests[1].resolve({ list: [{ id: 2 }], total: 1 })
  await second
  requests[0].resolve({ list: [{ id: 1 }], total: 1 })
  await first
  assert.equal(list.rows.value[0].id, 2)
  assert.equal(requests[1].query.filters.keyword, 'new')
  const bad = list.load()
  requests[2].reject(new Error('failure'))
  await bad
  assert.equal(list.failed.value, true)
  assert.deepEqual(list.rows.value, [])
  const retry = list.load()
  requests[3].resolve({ list: [{ id: 3 }], total: 1 })
  await retry
  assert.equal(list.failed.value, false)
  assert.equal(list.loading.value, false)

  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const permissions = usePermissionStore(pinia)
  permissions.setReady(true)
  permissions.setPermissions(['*'])
  const { useTableExample } = await server.ssrLoadModule('/examples/pages/table/useTableExample.ts')
  const demo = scoped(() => useTableExample())
  await demo.load()
  assert.equal(demo.total.value, 32)
  assert.equal(demo.rows.value[0].id, 32)
  demo.filters.keyword = 'iteration 3'
  await demo.search()
  assert.equal(demo.total.value, 4)
  await demo.changeSort({ prop: 'budget', order: 'ascending' })
  assert.equal(demo.rows.value[0].id, 3)
  demo.filters.keyword = ''
  await demo.reset()
  await demo.changePage(4)
  assert.equal(demo.rows.value.length, 2)
  assert.equal(await demo.remove(demo.rows.value.map((row) => row.id)), true)
  assert.equal(demo.query.page, 3)
  assert.equal(demo.total.value, 30)
  const input = { name: '  New task  ', category: 'engineering', status: 'active', budget: 200 }
  assert.equal(await demo.save(input), true)
  const added = demo.exportRows([]).find((row) => row.name === 'New task')
  assert.ok(added)
  assert.equal(await demo.save({ ...input, name: 'Edited' }, added.id), true)
  assert.equal(demo.exportRows([added.id])[0].name, 'Edited')
  assert.equal(await demo.save({ ...input, budget: -1 }), false)
  const writes = await Promise.all([demo.save(input), demo.save(input)])
  assert.deepEqual(writes, [true, false])
  await demo.simulateFailure()
  assert.equal(demo.failed.value, true)
  await demo.load()
  assert.equal(demo.failed.value, false)
  permissions.setPermissions(['system:table:list'])
  assert.equal(await demo.save(input), false)
  assert.equal(await demo.remove([added.id]), false)
  assert.deepEqual(demo.exportRows([]), [])
  await demo.load()
  assert.equal(demo.failed.value, false)
  permissions.setPermissions([])
  await demo.load()
  assert.equal(demo.failed.value, true)

  const { createExampleForm, formErrors, ownersByCategory, resolveFormDraft, validAttachment } =
    await server.ssrLoadModule('/examples/pages/form/model.ts')
  const form = createExampleForm()
  assert.ok(formErrors(form).name)
  Object.assign(form, {
    name: 'A project',
    owner: ownersByCategory.engineering[0],
    dates: ['2026-11-10', '2026-11-12'],
    agreed: true
  })
  assert.deepEqual(formErrors(form), {})
  form.notify = true
  assert.ok(formErrors(form).email)
  form.email = 'test@example.com'
  assert.deepEqual(formErrors(form), {})
  form.dates = ['2026-02-30', '2026-03-02']
  assert.ok(formErrors(form).dates)
  form.dates = ['2026-11-12', '2026-11-10']
  assert.ok(formErrors(form).dates)
  form.dates = ['2026-11-10', '2026-11-12']
  assert.deepEqual(resolveFormDraft({ version: 1, data: form }), form)
  for (const value of [
    null,
    {},
    { version: 2, data: form },
    { version: 1, data: { ...form, members: ['unknown'] } },
    { version: 1, data: { ...form, budget: Infinity } }
  ])
    assert.equal(resolveFormDraft(value), null)
  assert.equal(validAttachment({ name: 'demo.PDF', size: 1024 }), true)
  assert.equal(validAttachment({ name: 'demo.exe', size: 1024 }), false)
  assert.equal(validAttachment({ name: 'demo.png', size: 3 * 1024 * 1024 }), false)

  const { useProfileStore } = await load('store/modules/profile/index.ts')
  const { useUserStore } = await load('store/modules/user/index.ts')
  const { createLocalProfile, profileErrors, resolveProfileMap } = await load(
    'store/modules/profile/model.ts'
  )
  const profiles = useProfileStore(pinia),
    user = useUserStore(pinia)
  const account = {
    id: 1,
    username: 'admin',
    displayName: 'Server name',
    avatar: 'https://example.com/original.png',
    departmentId: null,
    isSuperAdmin: true,
    roles: ['admin'],
    permissions: ['*']
  }
  user.setUser(account)
  const original = JSON.stringify(user.userInfo)
  const profile = { ...createLocalProfile(), displayName: 'Local name', email: 'local@example.com' }
  assert.equal(profiles.save(account, profile), true)
  assert.equal(user.displayName, 'Local name')
  assert.equal(user.avatar, undefined)
  assert.equal(JSON.stringify(user.userInfo), original)
  assert.equal(profiles.get({ id: 1, username: 'another' }), undefined)
  user.setUser({ ...account, id: 2, username: 'viewer', displayName: 'Viewer' })
  assert.equal(user.displayName, 'Viewer')
  user.setUser(account)
  assert.equal(user.displayName, 'Local name')
  const reloaded = useProfileStore(createPinia())
  assert.equal(reloaded.get(account).displayName, 'Local name')
  assert.ok(profileErrors({ ...profile, avatar: 'javascript:alert(1)' }).avatar)
  assert.ok(profileErrors({ ...profile, avatar: 'https://user:pass@example.com/image.png' }).avatar)
  assert.equal(profiles.save(account, { ...profile, displayName: ' ' }), false)
  assert.deepEqual(Object.keys(resolveProfileMap({ __proto__: profile })), [])
  profiles.reset(account)
  assert.equal(user.displayName, 'Server name')
  assert.equal(user.avatar, account.avatar)
  user.reset()
  assert.equal(user.hasUserInfo, false)

  const { constantRoutes } = await load('router/routes/constant.ts')
  const router = createStubRouter(constantRoutes)
  assert.equal(router.resolve('/profile').meta.public, undefined)
  assert.equal(router.resolve('/examples/form').meta.public, undefined)
  assert.equal(router.resolve('/profile').meta.hidden, true)
  console.log(
    '通过：通用分页查询竞态、表格 CRUD/排序/末页回退/权限/失败重试、CSV 转义与公式防护、表单校验与草稿、附件限制、个人资料账号隔离与权限只读、新页面登录守卫。'
  )
} finally {
  scopes.forEach((scope) => scope.stop())
  await server.close()
}
