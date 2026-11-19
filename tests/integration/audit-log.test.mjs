import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope } from 'vue'
import { setActivePinia } from 'pinia'
import {
  createStubRouter,
  createTestServer,
  installMemoryStorage,
  waitFor
} from '../helpers/environment.mjs'

test('audit queries omit cleared filters and isolate results during a switch between authorized accounts', async (t) => {
  installMemoryStorage()
  const requests = []
  const originalFetch = globalThis.fetch
  const reply = (data) => Response.json({ code: 0, message: 'success', data })
  let actorId = 0
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input), 'https://example.invalid')
    if (url.pathname.endsWith('/auth/login')) {
      actorId++
      return Promise.resolve(reply({ accessToken: `session-${actorId}` }))
    }
    if (url.pathname.endsWith('/auth/session')) {
      return Promise.resolve(
        reply({
          user: {
            id: actorId,
            username: `account-${actorId}`,
            displayName: 'Sample',
            departmentId: null,
            isSuperAdmin: false,
            roles: [],
            permissions: ['system:audit-log:list']
          },
          routes: []
        })
      )
    }
    assert.ok(url.pathname.endsWith('/system/audit-logs'))
    return new Promise((resolve) => requests.push({ url, init, resolve }))
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const server = await createTestServer()
  t.after(() => server.close())
  const { pinia } = await server.ssrLoadModule('/src/store/index.ts')
  setActivePinia(pinia)
  const { constantRoutes } = await server.ssrLoadModule('/src/router/routes/index.ts')
  const { getSession } = await server.ssrLoadModule('/src/services/session.ts')
  const session = getSession(createStubRouter(constantRoutes))
  const { useAuditLogTable } = await server.ssrLoadModule(
    '/src/views/system/audit-log/useAuditLogTable.ts'
  )
  const scope = effectScope()
  t.after(() => scope.stop())
  const table = scope.run(useAuditLogTable)
  const signIn = (username) => session.signIn({ username, password: 'fixture' })
  const resolve = (requestIndex, id) => {
    requests[requestIndex].resolve(reply({ list: [{ id }], total: 1 }))
  }

  assert.equal(requests.length, 0)
  await signIn('first-account')
  await waitFor(() => requests.length === 1)
  resolve(0, 10)
  await waitFor(() => table.rows.value[0]?.id === 10)

  table.filters.action = 'role_grant'
  const filtered = table.search()
  await waitFor(() => requests.length === 2)
  assert.equal(requests[1].url.searchParams.get('action'), 'role_grant')
  table.filters.action = undefined
  const cleared = table.search()
  await waitFor(() => requests.length === 3)
  assert.equal(requests[1].init.signal.aborted, true)
  assert.equal(requests[2].url.searchParams.has('action'), false)
  resolve(1, 11)
  await filtered

  const nextAccount = signIn('second-account')
  assert.equal(requests[2].init.signal.aborted, true)
  assert.deepEqual(table.rows.value, [])
  await nextAccount
  await waitFor(() => requests.length === 4)
  resolve(3, 20)
  await waitFor(() => table.rows.value[0]?.id === 20)
  resolve(2, 12)
  await cleared
  assert.deepEqual(table.rows.value, [{ id: 20 }])
})
