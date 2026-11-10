import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { setActivePinia } from 'pinia'
import { createTestServer, installMemoryStorage } from '../../tests/helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer({ mock: true })
const scopes = []
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { resetMockDatabase, db } = await server.ssrLoadModule('/mock/rbac/database.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const {
    getDepartments,
    getDepartmentOptions,
    createDepartment,
    updateDepartment,
    deleteDepartment
  } = await load('api/modules/department.ts')
  const { getUsers, createUser, updateUser } = await load('api/modules/user.ts')
  const { getDynamicRoutes } = await load('api/modules/route.ts')
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useDepartmentManagement } = await load(
    'views/system/department/useDepartmentManagement.ts'
  )
  const { filterDepartmentTree } = await load('views/system/department/tree.ts')
  setActivePinia(pinia)
  const permissions = usePermissionStore(pinia)
  resetMockDatabase()
  tokenStorage.set('npora-mock-access-token')
  permissions.setPermissions(['*'])
  permissions.setReady(true)
  const input = {
    parentId: null,
    name: '客户服务中心',
    code: 'service',
    leader: '负责人',
    phone: '010-12345678',
    email: 'service@example.com',
    sortOrder: 40,
    status: 1
  }
  assert.ok(
    (await getDynamicRoutes())[0].children.some((route) => route.name === 'SystemDepartment')
  )
  const root = await createDepartment(input)
  const child = await createDepartment({
    ...input,
    parentId: root.id,
    name: '在线服务组',
    code: 'online-service'
  })
  const updated = await updateDepartment(child.id, {
    ...input,
    parentId: root.id,
    name: '客户支持组',
    code: 'online-service',
    sortOrder: 2
  })
  assert.equal(updated.name, '客户支持组')
  await assert.rejects(createDepartment(input), /部门编码已存在/)
  await assert.rejects(createDepartment({ ...input, code: 'SERVICE' }), /部门编码已存在/)
  await assert.rejects(
    createDepartment({ ...input, code: 'bad-parent', parentId: 999 }),
    /上级部门不存在/
  )
  await assert.rejects(
    createDepartment({ ...input, code: 'bad-email', email: 'invalid' }),
    /邮箱格式/
  )
  await assert.rejects(createDepartment({ ...input, code: 'bad-sort', sortOrder: -1 }), /请检查/)
  await assert.rejects(updateDepartment(root.id, { ...input, parentId: root.id }), /自己或下级/)
  await assert.rejects(updateDepartment(root.id, { ...input, parentId: child.id }), /自己或下级/)
  await assert.rejects(deleteDepartment(root.id), /下级部门/)
  const tree = await getDepartments()
  const filtered = filterDepartmentTree(tree, '支持', undefined)
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].id, root.id)
  assert.equal(filtered[0].children[0].id, child.id)
  assert.equal(tree.find((node) => node.id === root.id).children[0].id, child.id)
  assert.equal(filterDepartmentTree(tree, 'missing', undefined).length, 0)

  const userInput = {
    username: 'service_user',
    password: 'department-password',
    displayName: '客服用户',
    departmentId: child.id,
    avatar: null,
    email: null,
    mobile: null,
    status: 1,
    roleIds: [3]
  }
  const user = await createUser(userInput)
  const { username: _username, password: _password, ...userFields } = userInput
  assert.equal((await getUsers({ page: 1, pageSize: 10, departmentId: root.id })).total, 1)
  assert.equal(
    (await getUsers({ page: 1, pageSize: 10, departmentId: child.id })).list[0].id,
    user.id
  )
  assert.equal((await getUsers({ page: 1, pageSize: 50, departmentId: 1 })).total, 26)
  await assert.rejects(deleteDepartment(child.id), /关联用户/)
  await updateDepartment(child.id, {
    ...input,
    parentId: root.id,
    name: '客户支持组',
    code: 'online-service',
    status: 0
  })
  const options = await getDepartmentOptions()
  assert.equal(options.find((node) => node.id === root.id).children[0].status, 0)
  const changed = await updateUser(user.id, { ...userFields, displayName: '更新后的客服' })
  assert.equal(changed.departmentId, child.id)
  assert.equal(changed.status, 1)
  await assert.rejects(createUser({ ...userInput, username: 'inactive_department_user' }), /请检查/)
  await updateUser(user.id, { ...userFields, departmentId: null })
  await deleteDepartment(child.id)
  assert.ok(db.departments.find((node) => node.id === child.id).deleted_at)
  await assert.rejects(
    createDepartment({ ...input, parentId: root.id, code: 'online-service' }),
    /部门编码已存在/
  )
  await deleteDepartment(root.id)
  await assert.rejects(updateDepartment(root.id, input), /不存在或已被删除/)

  tokenStorage.set('npora-mock-viewer-token')
  await assert.rejects(getDepartments(), (error) => error.status === 403)
  await assert.rejects(createDepartment(input), (error) => error.status === 403)
  await assert.rejects(updateDepartment(2, input), (error) => error.status === 403)
  await assert.rejects(deleteDepartment(2), (error) => error.status === 403)
  assert.ok((await getDepartmentOptions()).length)
  tokenStorage.set('npora-mock-access-token')
  const scope = effectScope()
  scopes.push(scope)
  const model = scope.run(() => useDepartmentManagement())
  await model.load()
  assert.equal(model.tree.value[0].children.length, 2)
  model.filters.keyword = '研发'
  model.search()
  assert.equal(model.rows.value[0].children[0].id, 2)
  model.reset()
  assert.equal(model.rows.value[0].children.length, 2)
  const created = await model.save({ ...input, code: 'model-department' })
  assert.equal(created, true)
  const item = model.tree.value.find((node) => node.code === 'model-department')
  assert.equal(await model.remove(item.id), true)
  permissions.setPermissions([])
  await model.load()
  assert.equal(model.tree.value.length, 0)
  assert.equal(await model.save(input), false)
  console.log(
    '通过：部门树 CRUD、父级防环、字段与唯一性校验、关联用户保护、禁用部门保留关联、用户下级部门筛选及页面权限。'
  )
} finally {
  scopes.forEach((scope) => scope.stop())
  await server.close()
}
