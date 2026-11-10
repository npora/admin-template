// Repository-only integration: this file is outside the standalone Worker test entry.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../src/index.mjs'
import {
  service,
  userInput,
  userFields,
  roleInput,
  departmentInput,
  menuInput,
  password
} from '../tests/helpers/service.mjs'
import {
  createTestServer,
  createStubRouter,
  installMemoryStorage
} from '../../../tests/helpers/environment.mjs'

test('real frontend client/session round-trip against Worker HTTP handlers and SQLite', async (t) => {
  const f = await service(t)
  installMemoryStorage()
  const server = await createTestServer({ mock: false })
  t.after(() => server.close())
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    const raw = input instanceof Request ? input.url : String(input)
    const url = new URL(raw, 'https://api.example.test')
    return worker.fetch(new Request(url, init), f.env)
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { appConfig } = await load('config/app.ts')
  assert.equal(appConfig.mockEnabled, false)
  const { constantRoutes } = await load('router/routes/constant.ts')
  const router = createStubRouter(constantRoutes)
  const { getSession } = await load('services/session.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const session = getSession(router)
  await router.push('/login')
  await session.signIn({ username: 'admin', password })
  assert.equal(router.hasRoute('SystemUser'), true)
  const users = await load('api/modules/user.ts')
  const roles = await load('api/modules/role.ts')
  const departments = await load('api/modules/department.ts')
  const menus = await load('api/modules/menu.ts')
  const { getDashboardOverview } = await load('api/modules/dashboard.ts')
  assert.equal((await getDashboardOverview()).users.total, 3)
  const created = await users.createUser(userInput())
  assert.equal((await users.getUsers({ page: 1, pageSize: 10, keyword: 'new_user' })).total, 1)
  assert.equal(
    (await users.updateUser(created.id, userFields({ displayName: 'Client update' }))).displayName,
    'Client update'
  )
  const role = await roles.createRole(roleInput())
  await roles.updateRole(role.id, roleInput({ name: 'Client role' }))
  const granted = await roles.grantRoleMenus(role.id, [10, 11])
  assert.ok(granted.includes(1))
  assert.deepEqual(new Set(await roles.getRoleMenus(role.id)), new Set(granted))
  assert.ok((await roles.getRoleMenuOptions()).length)
  assert.ok((await roles.getRoleOptions()).length)
  const department = await departments.createDepartment(departmentInput())
  await departments.updateDepartment(department.id, departmentInput({ name: 'Client department' }))
  assert.ok((await departments.getDepartments()).length)
  assert.ok((await departments.getDepartmentOptions()).length)
  const menu = await menus.createMenu(menuInput())
  await menus.updateMenu(menu.id, menuInput({ title: 'Client menu' }))
  assert.ok((await menus.getMenus()).length)
  const { getRequestErrorMessage } = await load('api/errors/handling.ts')
  await assert.rejects(users.createUser(userInput()), (error) => {
    assert.match(getRequestErrorMessage(error), /已存在/)
    return true
  })
  await menus.deleteMenu(menu.id)
  await departments.deleteDepartment(department.id)
  await roles.deleteRole(role.id)
  await users.deleteUser(created.id)
  const oldToken = tokenStorage.get()
  await session.logout()
  assert.equal(tokenStorage.get(), null)
  assert.equal((await f.call('/auth/user', { token: oldToken })).status, 401)
  await session.signIn({ username: 'viewer', password })
  assert.equal(router.hasRoute('SystemUser'), true)
  assert.equal(router.hasRoute('SystemRole'), false)
  await assert.rejects(roles.getRoles({ page: 1, pageSize: 10 }))
  assert.ok((await getDashboardOverview()).users)
  await session.logout()
})
