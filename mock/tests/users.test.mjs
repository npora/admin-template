import {
  createTestServer,
  installMemoryStorage,
  waitFor
} from '../../tests/helpers/environment.mjs'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { setActivePinia } from 'pinia'

installMemoryStorage()
const server = await createTestServer({ mock: true })
const scopes = []
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { mockAdapter } = await server.ssrLoadModule('/mock/index.ts')
  const { resetMockDatabase } = await server.ssrLoadModule('/mock/rbac/database.ts')
  const { setupDepartmentMock } = await server.ssrLoadModule('/mock/modules/department.ts')
  const { setupRoleMock } = await server.ssrLoadModule('/mock/modules/role.ts')
  const { setupUserMock } = await server.ssrLoadModule('/mock/modules/user.ts')
  const { setupAuthMock } = await server.ssrLoadModule('/mock/modules/auth.ts')
  const { setupRouteMock } = await server.ssrLoadModule('/mock/modules/route.ts')
  const { getUsers, createUser, updateUser, deleteUser } = await load('api/modules/user.ts')
  const { login, getUserInfo } = await load('api/modules/auth.ts')
  const { getDynamicRoutes } = await load('api/modules/route.ts')
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useUserManagement } = await load('views/system/user/useUserManagement.ts')
  setActivePinia(pinia)
  const permissions = usePermissionStore(pinia)
  const newController = () => {
    const scope = effectScope()
    scopes.push(scope)
    return { scope, model: scope.run(() => useUserManagement()) }
  }
  const enableAdmin = () => {
    tokenStorage.set('npora-mock-access-token')
    permissions.setPermissions(['*'])
    permissions.setReady(true)
  }
  const resetMock = () => {
    resetMockDatabase()
    mockAdapter.reset()
    setupAuthMock(mockAdapter)
    setupRouteMock(mockAdapter)
    setupUserMock(mockAdapter)
    setupRoleMock(mockAdapter)
    setupDepartmentMock(mockAdapter)
  }
  const input = {
    username: 'new_user',
    displayName: '测试用户',
    email: 'new_user@example.com',
    roleIds: [2],
    password: 'test-password-123',
    departmentId: 2,
    avatar: null,
    mobile: null,
    status: 1
  }
  enableAdmin()
  resetMock()

  const first = await getUsers({ page: 1, pageSize: 10 })
  assert.equal(first.list.length, 10)
  assert.equal(first.total, 26)
  const third = await getUsers({ page: 3, pageSize: 10 })
  assert.equal(third.list.length, 6)
  assert.equal(new Set([...first.list, ...third.list].map((user) => user.id)).size, 16)
  const filtered = await getUsers({
    page: 1,
    pageSize: 50,
    roleId: 3,
    status: 1,
    keyword: 'user'
  })
  assert.ok(filtered.total > 0)
  assert.ok(
    filtered.list.every(
      (user) => user.roleIds.includes(3) && user.status === 1 && user.username.includes('user')
    )
  )
  assert.equal((await getUsers({ page: 1, pageSize: 10, keyword: 'not-found' })).total, 0)

  const created = await createUser(input)
  assert.equal(created.username, input.username)
  await assert.rejects(
    createUser({ ...input, username: 'NEW_USER', email: 'other@example.com' }),
    /用户名已存在/
  )
  await assert.rejects(createUser({ ...input, username: 'other_user' }), /邮箱已被使用/)
  await assert.rejects(createUser({ ...input, username: '1-invalid' }), /请检查/)
  await assert.rejects(createUser({ ...input, username: 'other_user', email: 'invalid' }), /请检查/)
  const { username: _username, password: _password, ...updateInput } = input
  const changed = await updateUser(created.id, {
    ...updateInput,
    displayName: '修改后的用户',
    email: 'changed@example.com',
    roleIds: [3],
    status: 0
  })
  assert.equal(changed.displayName, '修改后的用户')
  assert.equal(changed.username, input.username)
  assert.equal(changed.status, 0)
  assert.equal('passwordHash' in changed || 'password_hash' in changed, false)
  await assert.rejects(
    updateUser(created.id, { ...updateInput, username: 'ignored' }),
    /用户名和密码/
  )
  await assert.rejects(
    updateUser(created.id, { ...updateInput, email: 'admin@example.com' }),
    /邮箱已被使用/
  )
  await assert.rejects(updateUser(1, { ...updateInput, status: 0 }), /超级管理员/)
  await assert.rejects(deleteUser(1), /超级管理员/)
  await deleteUser(created.id)
  await assert.rejects(updateUser(created.id, updateInput), /用户不存在/)
  await assert.rejects(deleteUser(created.id), /用户不存在/)
  assert.equal((await getUsers({ page: 1, pageSize: 10 })).total, 26)

  // 验证只读账号的路由与接口授权，不只依赖前端隐藏按钮。
  tokenStorage.set((await login({ username: 'viewer', password: '123456' })).accessToken)
  const viewer = await getUserInfo()
  assert.deepEqual(viewer.permissions, ['system:user:list'])
  assert.deepEqual(
    (await getDynamicRoutes())[0].children.map((route) => route.name),
    ['SystemUser']
  )
  assert.equal((await getUsers({ page: 1, pageSize: 10 })).total, 26)
  await assert.rejects(createUser(input), (error) => error.status === 403)
  await assert.rejects(updateUser(3, input), (error) => error.status === 403)
  await assert.rejects(deleteUser(3), (error) => error.status === 403)
  permissions.setPermissions(viewer.permissions)
  const { model: readonlyModel } = newController()
  await readonlyModel.load()
  assert.equal(readonlyModel.rows.value.length, 10)
  const requestsBefore = mockAdapter.history.length
  assert.equal(await readonlyModel.save(input), false)
  assert.equal(await readonlyModel.remove(3), false)
  assert.equal(mockAdapter.history.length, requestsBefore)
  permissions.setPermissions([])
  await readonlyModel.load()
  assert.equal(readonlyModel.rows.value.length, 0)
  assert.equal(mockAdapter.history.length, requestsBefore)
  tokenStorage.remove()
  await assert.rejects(getUsers({ page: 1, pageSize: 10 }), (error) => error.code === 10002)

  // 页面控制器：查询、分页和删除最后一页的最后一条。
  enableAdmin()
  resetMock()
  const { model } = newController()
  await model.load()
  model.filters.keyword = ' user003 '
  await model.search()
  assert.equal(model.query.page, 1)
  assert.equal(model.total.value, 1)
  assert.equal(model.rows.value[0].username, 'user003')
  await model.reset()
  await model.changePageSize(20)
  assert.equal(model.rows.value.length, 20)
  await model.changePageSize(10)
  model.filters.roleId = 3
  await model.search()
  await model.changePage(Math.ceil(model.total.value / 10))
  const lastIds = model.rows.value.map((user) => user.id)
  for (const id of lastIds) assert.equal(await model.remove(id), true)
  assert.equal(model.query.page, 1)
  assert.equal(model.total.value, 10)
  assert.equal(model.rows.value.length, 10)
  await model.reset()
  assert.equal(await model.loadOptions(), true)
  assert.equal(model.roleOptions.value.length, 3)
  assert.equal(await model.save(input), true)
  const saved = (await getUsers({ page: 1, pageSize: 10, keyword: input.username })).list[0]
  assert.equal(await model.save({ ...input, displayName: '控制器编辑' }, saved.id), true)
  assert.equal(
    (await getUsers({ page: 1, pageSize: 10, keyword: input.username })).list[0].displayName,
    '控制器编辑'
  )

  // 快速查询时取消旧请求；迟到响应不能覆盖最新查询。
  mockAdapter.reset()
  let releaseOld
  let oldStarted = false
  mockAdapter.onGet('/system/users').reply(async (config) => {
    if (config.query.keyword === 'old') {
      oldStarted = true
      await new Promise((resolve) => {
        releaseOld = resolve
      })
      return {
        status: 200,
        data: {
          code: 0,
          message: 'success',
          data: { list: [{ ...first.list[0], displayName: '旧结果' }], total: 1 }
        }
      }
    }
    return {
      status: 200,
      data: {
        code: 0,
        message: 'success',
        data: { list: [{ ...first.list[0], displayName: '新结果' }], total: 1 }
      }
    }
  })
  model.filters.keyword = 'old'
  const oldSearch = model.search()
  await waitFor(() => oldStarted)
  model.filters.keyword = 'new'
  await model.search()
  releaseOld()
  await oldSearch
  assert.equal(model.rows.value[0].displayName, '新结果')
  assert.equal(model.loading.value, false)
  assert.equal(model.loadFailed.value, false)

  // 失败可重试，重复保存不会发出两次写请求。
  mockAdapter.reset()
  mockAdapter
    .onGet('/system/users')
    .replyOnce(200, { code: 10001, message: '列表暂时不可用', data: null })
  mockAdapter
    .onGet('/system/users')
    .reply(200, { code: 0, message: 'success', data: { list: [], total: 0 } })
  await model.load()
  assert.equal(model.loadFailed.value, true)
  assert.equal(model.loading.value, false)
  await model.load()
  assert.equal(model.loadFailed.value, false)
  let releaseSave
  let saves = 0
  mockAdapter.onPost('/system/users').reply(async () => {
    saves += 1
    await new Promise((resolve) => {
      releaseSave = resolve
    })
    return {
      status: 200,
      data: {
        code: 0,
        message: 'success',
        data: { ...input, id: 99, createdAt: new Date().toISOString() }
      }
    }
  })
  const saving = model.save(input)
  assert.equal(await model.save(input), false)
  await waitFor(() => saves === 1)
  releaseSave()
  assert.equal(await saving, true)
  assert.equal(saves, 1)
  assert.equal(model.saving.value, false)

  // 卸载后取消请求，不能回写已销毁页面。
  mockAdapter.reset()
  let releaseDisposed
  let disposedStarted = false
  mockAdapter.onGet('/system/users').reply(async () => {
    disposedStarted = true
    await new Promise((resolve) => {
      releaseDisposed = resolve
    })
    return {
      status: 200,
      data: { code: 0, message: 'success', data: { list: first.list, total: first.total } }
    }
  })
  const { scope, model: disposedModel } = newController()
  const loading = disposedModel.load()
  await waitFor(() => disposedStarted)
  scope.stop()
  releaseDisposed()
  await loading
  assert.equal(disposedModel.rows.value.length, 0)

  console.log(
    '通过：用户 CRUD、查询分页、校验与唯一性、管理员保护、只读路由/接口授权、末页回退、查询竞态、失败重试及重复提交。'
  )
} finally {
  scopes.forEach((scope) => scope.stop())
  await server.close()
}
