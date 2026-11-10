import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import {
  createTestServer,
  installMemoryStorage,
  waitFor
} from '../../tests/helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer({ mock: true })
const scopes = []
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { db, resetMockDatabase } = await server.ssrLoadModule('/mock/rbac/database.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { mockAdapter } = await server.ssrLoadModule('/mock/index.ts')
  const { getDashboardOverview } = await load('api/modules/dashboard.ts')
  const { useDashboard } = await load('views/dashboard/useDashboard.ts')
  resetMockDatabase()
  tokenStorage.set('npora-mock-access-token')
  const overview = await getDashboardOverview()
  assert.deepEqual(overview.capabilities, {
    users: true,
    roles: true,
    departments: true,
    menus: true
  })
  assert.equal(overview.users.total, 26)
  assert.equal(overview.users.enabled + overview.users.disabled, overview.users.total)
  assert.equal(
    overview.users.departments.reduce((count, group) => count + group.count, 0),
    overview.users.total
  )
  assert.equal(overview.roles.total, 3)
  assert.equal(overview.departments.total, 3)
  assert.equal(overview.accessiblePages, 7)
  assert.equal(overview.account.isSuperAdmin, true)
  assert.ok(overview.users.recent.length <= 5)
  assert.ok(overview.users.recent.every((user) => !('password_hash' in user)))
  const newest = overview.users.recent[0]
  assert.equal(newest.id, 26)
  db.users.find((user) => user.id === 26).deleted_at = new Date().toISOString()
  assert.equal((await getDashboardOverview()).users.total, 25)
  tokenStorage.set('npora-mock-viewer-token')
  const viewer = await getDashboardOverview()
  assert.equal(viewer.users.total, 25)
  assert.equal(viewer.roles, undefined)
  assert.equal(viewer.departments, undefined)
  assert.equal(viewer.accessiblePages, 2)
  assert.deepEqual(viewer.capabilities, {
    users: true,
    roles: false,
    departments: false,
    menus: false
  })
  db.userRoles = db.userRoles.filter((link) => link.user_id !== 2)
  const empty = await getDashboardOverview()
  assert.equal(empty.users, undefined)
  assert.equal(empty.roles, undefined)
  assert.equal(empty.departments, undefined)
  assert.equal(empty.accessiblePages, 1)
  tokenStorage.remove()
  await assert.rejects(getDashboardOverview(), (error) => error.code === 10002)

  tokenStorage.set('npora-mock-access-token')
  const scope = effectScope()
  scopes.push(scope)
  const model = scope.run(() => useDashboard())
  await model.load()
  assert.equal(model.overview.value.users.total, 25)
  const previous = model.overview.value
  mockAdapter.resetHandlers()
  mockAdapter
    .onGet('/system/dashboard')
    .replyOnce(200, { code: 10001, message: '概览暂不可用', data: null })
  mockAdapter.onGet('/system/dashboard').reply(200, { code: 0, message: 'success', data: overview })
  await model.load()
  assert.equal(model.failed.value, true)
  assert.equal(model.overview.value, previous)
  assert.equal(model.loading.value, false)
  await model.load()
  assert.equal(model.failed.value, false)
  assert.equal(model.overview.value.users.total, 26)

  mockAdapter.resetHandlers()
  let firstStarted = false,
    releaseFirst
  let calls = 0
  mockAdapter.onGet('/system/dashboard').reply(async () => {
    calls++
    const value = calls
    if (value === 1) {
      firstStarted = true
      await new Promise((resolve) => {
        releaseFirst = resolve
      })
    }
    return {
      status: 200,
      data: { code: 0, message: 'success', data: { ...overview, accessiblePages: value } }
    }
  })
  const first = model.load()
  await waitFor(() => firstStarted)
  await model.load()
  releaseFirst()
  await first
  assert.equal(model.overview.value.accessiblePages, 2)
  assert.equal(model.loading.value, false)
  console.log('通过：工作台真实汇总、权限隔离、软删除统计、失败保留旧数据、重试与刷新竞态。')
} finally {
  scopes.forEach((scope) => scope.stop())
  await server.close()
}
