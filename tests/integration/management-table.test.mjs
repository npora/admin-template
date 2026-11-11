import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestServer, installMemoryStorage } from '../helpers/environment.mjs'

const deferred = () => {
  let resolve
  const promise = new Promise((done) => (resolve = done))
  return { promise, resolve }
}

async function setup(t, resource) {
  installMemoryStorage()
  const server = await createTestServer()
  t.after(() => server.close())
  setActivePinia(createPinia())
  const { usePermissionStore } = await server.ssrLoadModule(
    '/src/store/modules/permission/index.ts'
  )
  const { tokenStorage } = await server.ssrLoadModule('/src/api/auth/token-storage.ts')
  const { useManagementTable } = await server.ssrLoadModule(
    '/src/composables/useManagementTable.ts'
  )
  const permissions = usePermissionStore()
  permissions.setReady(true)
  permissions.setPermissions(['*'])
  tokenStorage.set('first-account')
  const scope = effectScope()
  t.after(() => scope.stop())
  return {
    table: scope.run(() => useManagementTable({ permission: 'role', ...resource })),
    permissions,
    tokenStorage,
    scope
  }
}

test('management queries abort superseded requests and ignore late results after account change or disposal', async (t) => {
  const requests = []
  const { table, tokenStorage, scope } = await setup(t, {
    list(query, signal) {
      const pending = deferred()
      requests.push({ query, signal, ...pending })
      return pending.promise
    }
  })
  const first = table.load()
  table.filters.keyword = ' newest '
  const second = table.search()
  assert.equal(requests[0].signal.aborted, true)
  assert.equal(requests[1].query.keyword, 'newest')
  requests[1].resolve({ list: [{ id: 2 }], total: 1 })
  await second
  requests[0].resolve({ list: [{ id: 1 }], total: 1 })
  await first
  assert.deepEqual(table.rows.value, [{ id: 2 }])
  const previousAccount = table.load()
  tokenStorage.set('second-account')
  requests[2].resolve({ list: [{ id: 3 }], total: 1 })
  await previousAccount
  assert.deepEqual(table.rows.value, [{ id: 2 }])
  const unmounted = table.load()
  scope.stop()
  assert.equal(requests[3].signal.aborted, true)
  requests[3].resolve({ list: [{ id: 4 }], total: 1 })
  await unmounted
  assert.deepEqual(table.rows.value, [{ id: 2 }])
})

test('management mutations share a busy guard, refresh once, retreat from empty pages and respect permissions', async (t) => {
  const queries = []
  const mutation = deferred()
  let creates = 0,
    removes = 0,
    changes = 0
  const { table, permissions, tokenStorage } = await setup(t, {
    async list(query) {
      queries.push(query)
      return { list: [{ id: query.page }], total: 11 }
    },
    create() {
      creates++
      return mutation.promise
    },
    async update() {},
    async remove() {
      removes++
    },
    onChanged() {
      changes++
    }
  })
  permissions.setPermissions([])
  await table.load()
  assert.equal(queries.length, 0)
  assert.equal(await table.save({}), false)
  permissions.setPermissions(['*'])
  const saving = table.save({})
  assert.equal(table.busy.value, true)
  assert.equal(await table.save({}), false)
  assert.equal(await table.remove(1), false)
  mutation.resolve()
  assert.equal(await saving, true)
  assert.equal(creates, 1)
  assert.equal(removes, 0)
  assert.equal(changes, 1)
  assert.equal(queries.length, 1, 'successful save refreshes exactly once')
  await table.changePage(5)
  assert.deepEqual(
    queries.slice(-2).map((query) => query.page),
    [5, 2]
  )
  await table.remove(1)
  assert.equal(removes, 1)
  assert.equal(changes, 2)
  assert.equal(queries.length, 4, 'delete refreshes once on the remaining page')
  await table.changePageSize(-1)
  assert.equal(table.query.pageSize, 10)
  assert.equal(table.query.page, 1)
  const staleMutation = deferred()
  // 同一实例中，更新结果也不能跨会话触发缓存失效或列表请求。
  const originalChanges = changes
  const stale = await setup(t, {
    list: async () => {
      throw new Error('must not refresh stale mutation')
    },
    create: () => staleMutation.promise,
    onChanged: () => changes++
  })
  const pending = stale.table.save({})
  stale.tokenStorage.set('other-account')
  staleMutation.resolve()
  assert.equal(await pending, false)
  assert.equal(changes, originalChanges)
  tokenStorage.remove()
})

test('user adapter preserves extra filters and immutable credentials, blocks super admin deletion and cancels option queries', async (t) => {
  const requests = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    const pending = deferred()
    requests.push({ input, init, ...pending })
    return pending.promise
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const { waitFor } = await import('../helpers/environment.mjs')
  installMemoryStorage()
  const server = await createTestServer()
  t.after(() => server.close())
  setActivePinia(createPinia())
  const { usePermissionStore } = await server.ssrLoadModule(
    '/src/store/modules/permission/index.ts'
  )
  const permissions = usePermissionStore()
  permissions.setReady(true)
  permissions.setPermissions(['*'])
  const { useUserManagement } = await server.ssrLoadModule(
    '/src/views/system/user/useUserManagement.ts'
  )
  const scope = effectScope()
  t.after(() => scope.stop())
  const table = scope.run(() => useUserManagement())
  const reply = (request, data) =>
    request.resolve(Response.json({ code: 0, message: 'success', data }))
  const pendingOptions = table.loadOptions()
  await waitFor(() => requests.length === 2)
  const latestOptions = table.loadOptions()
  await waitFor(() => requests.length === 4)
  assert.equal(requests[0].init.signal.aborted, true)
  reply(requests[2], [{ id: 2 }])
  reply(requests[3], [{ id: 20 }])
  assert.equal(await latestOptions, true)
  reply(requests[0], [{ id: 1 }])
  reply(requests[1], [{ id: 10 }])
  assert.equal(await pendingOptions, false)
  assert.deepEqual(table.roleOptions.value, [{ id: 2 }])
  assert.deepEqual(table.departments.value, [{ id: 20 }])
  table.filters.roleId = 2
  table.filters.departmentId = 20
  const search = table.search()
  await waitFor(() => requests.length === 5)
  assert.match(String(requests[4].input), /roleId=2/)
  assert.match(String(requests[4].input), /departmentId=20/)
  reply(requests[4], { list: [{ id: 1, isSuperAdmin: true }], total: 1 })
  await search
  assert.equal(await table.remove(1), false)
  assert.equal(requests.length, 5)
  const save = table.save({ username: 'immutable', password: 'secret', displayName: 'Edited' }, 1)
  await waitFor(() => requests.length === 6)
  assert.deepEqual(JSON.parse(requests[5].init.body), { displayName: 'Edited' })
  reply(requests[5], {})
  await waitFor(() => requests.length === 7)
  reply(requests[6], { list: [{ id: 1, isSuperAdmin: true }], total: 1 })
  assert.equal(await save, true)
  assert.equal(requests.length, 7, 'one update followed by one list request')
})
