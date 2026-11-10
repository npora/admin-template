import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  service,
  password,
  userInput,
  userFields,
  roleInput,
  departmentInput,
  menuInput
} from './helpers/service.mjs'
import { snapshot, commit, update } from '../src/repositories/management.mjs'
import { authenticate } from '../src/modules/auth.mjs'

function data(result) {
  assert.equal(result.status, 200, JSON.stringify(result.body))
  return result.body.data
}
const post = (json, token) => ({ method: 'POST', json, ...(token ? { token } : {}) })
const put = (json, token) => ({ method: 'PUT', json, ...(token ? { token } : {}) })

test('all management endpoints require authentication, obey methods, and deny readonly writes', async (t) => {
  const f = await service(t)
  for (const resource of ['users', 'roles', 'departments', 'menus']) {
    const path = `/system/${resource}`
    assert.equal((await f.call(path, { token: null })).status, 401)
    assert.equal((await f.call(path, post({}, f.viewer))).status, 403)
    assert.equal((await f.call(`${path}/1`, put({}, f.viewer))).status, 403)
    assert.equal((await f.call(`${path}/1`, { method: 'DELETE', token: f.viewer })).status, 403)
    assert.equal((await f.call(path, { method: 'PUT' })).status, 405)
    assert.equal((await f.call(`${path}/1`)).status, 405)
    assert.equal((await f.call(`${path}/0`)).status, 404)
  }
  assert.equal((await f.call('/system/roles', { token: f.viewer })).status, 403)
  assert.equal((await f.call('/system/roles/menu-options', { token: f.viewer })).status, 403)
  assert.equal((await f.call('/system/roles/3/menus', put({ menuIds: [] }, f.viewer))).status, 403)
  assert.equal((await f.call('/system/users/options')).status, 404)
  assert.equal((await f.call('/system/roles/9007199254740992')).status, 404)
  const cors = await f.call('/system/users/1', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000' }
  })
  assert.equal(cors.status, 204)
  assert.ok(cors.response.headers.get('Access-Control-Allow-Methods').includes('DELETE'))
})

test('users create/login/update/delete persist with role DTOs and no credential leakage', async (t) => {
  const f = await service(t)
  const created = data(
    await f.call('/system/users', post(userInput({ email: 'new@example.test' })))
  )
  assert.equal(created.departmentName, '产品研发部')
  assert.deepEqual(created.roleIds, [3])
  assert.equal(created.roles[0].code, 'viewer')
  assert.equal(created.isSuperAdmin, false)
  assert.equal('password_hash' in created, false)
  assert.equal('password' in created, false)
  const signed = data(await f.login('NEW_USER'))
  assert.equal(data(await f.call('/auth/user', { token: signed.accessToken })).username, 'new_user')
  const updated = data(
    await f.call(
      `/system/users/${created.id}`,
      put(userFields({ displayName: 'Renamed', roleIds: [2, 3], email: 'new@example.test' }))
    )
  )
  assert.deepEqual(new Set(updated.roleIds), new Set([2, 3]))
  assert.equal(updated.displayName, 'Renamed')
  assert.ok(
    data(await f.call('/auth/user', { token: signed.accessToken })).permissions.includes(
      'system:user:create'
    )
  )
  data(await f.call(`/system/users/${created.id}`, { method: 'DELETE' }))
  assert.equal((await f.call('/auth/user', { token: signed.accessToken })).status, 401)
  assert.equal(data(await f.call('/system/users?keyword=new_user')).total, 0)
  assert.equal((await f.call('/system/users', post(userInput()))).status, 409)
  assert.equal((await f.call(`/system/users/${created.id}`, put(userFields()))).status, 404)
})

test('users search, SQL pagination and descendant department filters are consistent', async (t) => {
  const f = await service(t)
  for (let index = 0; index < 5; index++)
    data(
      await f.call(
        '/system/users',
        post(
          userInput({
            username: `person_${index}`,
            departmentId: index % 2 ? 3 : 2,
            status: index % 2
          })
        )
      )
    )
  const result = data(
    await f.call('/system/users?page=2&pageSize=2&keyword=person_&departmentId=1')
  )
  assert.equal(result.total, 5)
  assert.equal(result.list.length, 2)
  assert.deepEqual(
    result.list.map((row) => row.roleIds),
    [[3], [3]]
  )
  assert.equal(
    data(await f.call('/system/users?keyword=person_&departmentId=2&status=0&roleId=3')).total,
    3
  )
  assert.equal(data(await f.call('/system/users?keyword=%27%20OR%201%3D1--')).total, 0)
  assert.equal(data(await f.call('/system/users?departmentId=999')).total, 0)
  for (const query of [
    'page=0',
    'page=1.1',
    'pageSize=101',
    'departmentId=abc',
    'roleId=-1',
    'status=2'
  ])
    assert.equal((await f.call(`/system/users?${query}`)).status, 400)
})

test('users enforce immutable fields, unique values, references and superadmin protections', async (t) => {
  const f = await service(t)
  for (const json of [
    userInput({ isSuperAdmin: true }),
    userInput({ password: 'short' }),
    userInput({ roleIds: [3, 3] }),
    userInput({ displayName: '' }),
    userInput({ email: 'bad' }),
    userInput({ avatar: 'javascript:bad' })
  ])
    assert.equal((await f.call('/system/users', post(json))).status, 400)
  assert.equal((await f.call('/system/users', post(userInput({ roleIds: [999] })))).status, 404)
  assert.equal((await f.call('/system/users/1', put(userFields({ status: 0 })))).status, 409)
  assert.equal((await f.call('/system/users/1', { method: 'DELETE' })).status, 409)
  assert.equal(
    (await f.call('/system/users/2', put({ ...userFields(), username: 'changed' }))).status,
    400
  )
  data(
    await f.call('/system/users', post(userInput({ email: 'unique@example.test', mobile: '123' })))
  )
  assert.equal(
    (
      await f.call(
        '/system/users',
        post(userInput({ username: 'other_user', email: 'UNIQUE@example.test' }))
      )
    ).status,
    409
  )
  assert.equal(
    (await f.call('/system/users', post(userInput({ username: 'other_user', mobile: '123' }))))
      .status,
    409
  )
  f.sqlite.exec('UPDATE sys_department SET status=0 WHERE id=2')
  assert.equal(
    (await f.call('/system/users', post(userInput({ username: 'other_user' })))).status,
    400
  )
  assert.equal((await f.call('/system/users/3', put(userFields({ roleIds: [2] })))).status, 200)
})

test('editors can edit profiles and create unassigned users but cannot assign roles', async (t) => {
  const f = await service(t)
  data(
    await f.call(
      '/system/users/2',
      put(userFields({ displayName: 'Profile edit', departmentId: 3 }), f.editor)
    )
  )
  assert.equal(
    (await f.call('/system/users/2', put(userFields({ roleIds: [2] }), f.editor))).status,
    403
  )
  assert.equal((await f.call('/system/users', post(userInput(), f.editor))).status, 403)
  data(await f.call('/system/users', post(userInput({ roleIds: [] }), f.editor)))
  assert.equal(
    f.sqlite.prepare("SELECT count(*) n FROM sys_user WHERE username='new_user'").get().n,
    1
  )
})

test('roles CRUD preserve soft-delete uniqueness and protect assigned roles', async (t) => {
  const f = await service(t)
  const role = data(await f.call('/system/roles', post(roleInput())))
  const updated = data(
    await f.call(`/system/roles/${role.id}`, put(roleInput({ name: 'Updated', status: 0 })))
  )
  assert.equal(updated.name, 'Updated')
  assert.equal(data(await f.call('/system/roles?keyword=test_role&status=0')).total, 1)
  assert.ok(
    data(await f.call('/system/roles/options', { token: f.viewer })).some(
      (row) => row.id === role.id && row.status === 0
    )
  )
  assert.equal((await f.call('/system/roles/3', { method: 'DELETE' })).status, 409)
  data(await f.call(`/system/roles/${role.id}`, { method: 'DELETE' }))
  assert.equal((await f.call('/system/roles', post(roleInput({ code: 'TEST_ROLE' })))).status, 409)
  assert.equal((await f.call(`/system/roles/${role.id}/menus`)).status, 404)
  assert.equal((await f.call('/system/roles', post(roleInput({ status: 2 })))).status, 400)
})

test('role grants add ancestors only, replace atomically and change existing session access', async (t) => {
  const f = await service(t)
  let granted = data(await f.call('/system/roles/3/menus', put({ menuIds: [10, 11, 12] })))
  assert.ok(granted.includes(1))
  assert.ok(!granted.includes(13))
  assert.ok(
    data(await f.call('/auth/user', { token: f.viewer })).permissions.includes('system:user:create')
  )
  const before = data(await f.call('/system/roles/3/menus'))
  assert.equal((await f.call('/system/roles/3/menus', put({ menuIds: [10, 999] }))).status, 404)
  assert.deepEqual(data(await f.call('/system/roles/3/menus')), before)
  data(await f.call('/system/roles/3/menus', put({ menuIds: [1] })))
  assert.deepEqual(data(await f.call('/auth/routes', { token: f.viewer })), [])
  assert.deepEqual(data(await f.call('/auth/user', { token: f.viewer })).permissions, [])
  data(await f.call('/system/roles/3/menus', put({ menuIds: [] })))
  assert.deepEqual(data(await f.call('/system/roles/3/menus')), [])
})

test('department CRUD prevents cycles, linked deletions and code reuse after soft delete', async (t) => {
  const f = await service(t)
  const department = data(await f.call('/system/departments', post(departmentInput())))
  const child = data(
    await f.call(
      '/system/departments',
      post(departmentInput({ parentId: department.id, code: 'child' }))
    )
  )
  assert.equal(
    (
      await f.call(
        `/system/departments/${department.id}`,
        put(departmentInput({ parentId: child.id }))
      )
    ).status,
    400
  )
  assert.equal(
    (await f.call(`/system/departments/${department.id}`, { method: 'DELETE' })).status,
    409
  )
  assert.equal((await f.call('/system/departments/2', { method: 'DELETE' })).status, 409)
  data(await f.call(`/system/departments/${child.id}`, { method: 'DELETE' }))
  data(
    await f.call(
      `/system/departments/${department.id}`,
      put(departmentInput({ name: 'Updated', status: 0 }))
    )
  )
  data(await f.call(`/system/departments/${department.id}`, { method: 'DELETE' }))
  assert.equal(
    (await f.call('/system/departments', post(departmentInput({ code: 'TEST_DEPARTMENT' }))))
      .status,
    409
  )
  assert.ok(data(await f.call('/system/departments/options', { token: f.viewer })).length)
})

test('menu CRUD validates hierarchy, component allowlist, reserved paths, redirects and permissions', async (t) => {
  const f = await service(t)
  const page = data(await f.call('/system/menus', post(menuInput())))
  const buttonInput = menuInput({
    parentId: page.id,
    type: 3,
    title: 'Action',
    name: null,
    path: null,
    component: null,
    permission: 'custom:test:action'
  })
  const button = data(await f.call('/system/menus', post(buttonInput)))
  assert.equal((await f.call(`/system/menus/${page.id}`, { method: 'DELETE' })).status, 409)
  for (const input of [
    menuInput({ name: 'Profile' }),
    menuInput({ path: '/profile' }),
    menuInput({ name: 'Other', component: 'internal/unknown/index' }),
    menuInput({ type: 1, name: null, component: null, path: '/redirect', redirect: '/redirect' }),
    menuInput({ path: '//evil' }),
    menuInput({ path: '/../evil' }),
    menuInput({ parentId: page.id }),
    menuInput({ routeQuery: [] })
  ]) {
    assert.ok([400, 409].includes((await f.call('/system/menus', post(input))).status))
  }
  data(
    await f.call(
      `/system/menus/${page.id}`,
      put(menuInput({ visible: false, routeQuery: { tab: 'detail', id: 2 } }))
    )
  )
  data(await f.call(`/system/menus/${button.id}`, { method: 'DELETE' }))
  data(await f.call(`/system/menus/${page.id}`, { method: 'DELETE' }))
  assert.equal((await f.call('/system/menus', post(menuInput()))).status, 409)
  assert.equal(
    (
      await f.call(
        '/system/menus',
        post(
          menuInput({
            parentId: 10,
            type: 3,
            title: 'Invalid',
            name: null,
            path: null,
            component: null,
            permission: '*'
          })
        )
      )
    ).status,
    400
  )
})

test('moving parent directories checks descendant full paths and redirect cycles', async (t) => {
  const f = await service(t)
  const dir = data(
    await f.call(
      '/system/menus',
      post(menuInput({ type: 1, name: null, component: null, path: '/folder' }))
    )
  )
  const page = data(
    await f.call(
      '/system/menus',
      post(menuInput({ parentId: dir.id, name: 'Nested', path: 'page' }))
    )
  )
  data(await f.call('/system/menus', post(menuInput({ name: 'Other', path: '/taken/page' }))))
  assert.equal(
    (
      await f.call(
        `/system/menus/${dir.id}`,
        put(menuInput({ type: 1, name: null, component: null, path: '/taken' }))
      )
    ).status,
    409
  )
  assert.equal(
    (
      await f.call(
        `/system/menus/${dir.id}`,
        put(menuInput({ type: 1, name: null, component: null, path: '/folder', parentId: dir.id }))
      )
    ).status,
    400
  )
  const second = data(
    await f.call(
      '/system/menus',
      post(
        menuInput({ type: 1, name: null, component: null, path: '/second', redirect: '/folder' })
      )
    )
  )
  assert.equal(
    (
      await f.call(
        `/system/menus/${dir.id}`,
        put(
          menuInput({ type: 1, name: null, component: null, path: '/folder', redirect: '/second' })
        )
      )
    ).status,
    400
  )
  assert.ok(page.id && second.id)
})

test('dashboard returns permission-scoped SQL totals and follows soft deletion', async (t) => {
  const f = await service(t)
  const admin = data(await f.call('/system/dashboard'))
  assert.equal(admin.users.total, 3)
  assert.equal(admin.users.recent.length, 3)
  assert.equal(admin.roles.total, 3)
  assert.equal(admin.departments.total, 3)
  assert.equal(
    admin.users.departments.reduce((sum, row) => sum + row.count, 0),
    3
  )
  assert.equal(JSON.stringify(admin).includes('password_hash'), false)
  const viewer = data(await f.call('/system/dashboard', { token: f.viewer }))
  assert.equal(viewer.users.total, 3)
  assert.equal('roles' in viewer, false)
  assert.equal('departments' in viewer, false)
  assert.equal(viewer.account.roleNames[0], '只读用户')
  data(await f.call('/system/roles/3/menus', put({ menuIds: [] })))
  assert.equal('users' in data(await f.call('/system/dashboard', { token: f.viewer })), false)
  data(await f.call('/system/users/3', { method: 'DELETE' }))
  assert.equal(data(await f.call('/system/dashboard')).users.total, 2)
})

test('revision guard rejects stale writes and atomic batches roll back every association', async (t) => {
  const f = await service(t)
  const actor = await authenticate(
    new Request('https://example.test', { headers: { Authorization: `Bearer ${f.admin}` } }),
    f.db
  )
  let state = await snapshot(f.db, actor)
  f.sqlite.exec("UPDATE sys_role SET name='Concurrent change' WHERE id=2")
  await assert.rejects(
    commit(f.db, actor, state, [update(f.db, 'sys_role', 3, { name: 'Stale' })]),
    (error) => error.status === 409
  )
  assert.equal(f.sqlite.prepare('SELECT name FROM sys_role WHERE id=3').get().name, '只读用户')
  state = await snapshot(f.db, actor)
  const before = f.sqlite.prepare('SELECT * FROM sys_role_menu WHERE role_id=3').all()
  await assert.rejects(
    commit(f.db, actor, state, [
      f.db.prepare('DELETE FROM sys_role_menu WHERE role_id=3'),
      f.db.prepare('INSERT INTO sys_role_menu(role_id,menu_id) VALUES(3,9999)')
    ]),
    (error) => error.status === 409
  )
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM sys_role_menu WHERE role_id=3').all(), before)
  state = await snapshot(f.db, actor)
  f.sqlite.exec('DELETE FROM sys_auth_session WHERE user_id=1')
  await assert.rejects(
    commit(f.db, actor, state, [update(f.db, 'sys_role', 3, { name: 'Revoked' })]),
    (error) => error.status === 401
  )
})

test('parallel duplicate creates never leave partial users or role assignments', async (t) => {
  const f = await service(t)
  const results = await Promise.all([
    f.call('/system/users', post(userInput())),
    f.call('/system/users', post(userInput()))
  ])
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409])
  assert.equal(
    f.sqlite.prepare("SELECT count(*) n FROM sys_user WHERE username='new_user'").get().n,
    1
  )
  assert.equal(
    f.sqlite
      .prepare(
        "SELECT count(*) n FROM sys_user_role ur JOIN sys_user u ON u.id=ur.user_id WHERE u.username='new_user'"
      )
      .get().n,
    1
  )
})
