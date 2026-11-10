import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { setActivePinia } from 'pinia'
import {
  createTestServer,
  createStubRouter,
  installMemoryStorage
} from '../../tests/helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer({ mock: true })
const scopes = []
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { db, resetMockDatabase } = await server.ssrLoadModule('/mock/rbac/database.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { getUsers, createUser, updateUser, deleteUser } = await load('api/modules/user.ts')
  const {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getRoleMenus,
    grantRoleMenus,
    getRoleMenuOptions
  } = await load('api/modules/role.ts')
  const { getMenus, createMenu, updateMenu, deleteMenu } = await load('api/modules/menu.ts')
  const { getDepartmentOptions } = await load('api/modules/department.ts')
  const { getUserInfo, login } = await load('api/modules/auth.ts')
  const { getDynamicRoutes } = await load('api/modules/route.ts')
  const { pinia } = await load('store/index.ts')
  const { usePermissionStore } = await load('store/modules/permission/index.ts')
  const { useRoleManagement } = await load('views/system/role/useRoleManagement.ts')
  const { useMenuManagement } = await load('views/system/menu/useMenuManagement.ts')
  const { getSession } = await load('services/session.ts')
  const { constantRoutes } = await load('router/routes/constant.ts')
  const { setupAuthGuard } = await load('router/guards/auth.ts')
  const permissions = usePermissionStore(pinia)
  setActivePinia(pinia)
  resetMockDatabase()
  const admin = () => {
    tokenStorage.set('npora-mock-access-token')
    permissions.setPermissions(['*'])
    permissions.setReady(true)
  }
  const asUser = async (username, password = 'rbac-password-123') => {
    tokenStorage.set((await login({ username, password })).accessToken)
    return getUserInfo()
  }
  const flat = (tree) => tree.flatMap((node) => [node, ...flat(node.children ?? [])])
  const fields = {
    departmentId: 2,
    displayName: '权限测试用户',
    avatar: null,
    email: null,
    mobile: null,
    status: 1,
    roleIds: []
  }
  const roleInput = {
    code: 'custom_operator',
    name: '自定义操作员',
    description: '测试授权关系',
    sortOrder: 5,
    status: 1
  }
  const menuInput = {
    parentId: null,
    type: 1,
    title: '权限测试目录',
    name: null,
    path: '/rbac-demo',
    component: null,
    redirect: null,
    routeQuery: null,
    activeMenu: null,
    icon: 'setting',
    permission: null,
    visible: true,
    alwaysShow: true,
    keepAlive: false,
    fixedTab: false,
    sortOrder: 100,
    status: 1
  }
  admin()

  // DTO 与 SQL 行独立，敏感密码哈希不出现在任何用户响应中。
  const users = await getUsers({ page: 1, pageSize: 50 })
  assert.equal(users.total, 26)
  assert.ok(users.list.every((user) => [0, 1].includes(user.status) && Array.isArray(user.roleIds)))
  assert.ok(
    users.list.every(
      (user) => !('password' in user) && !('password_hash' in user) && !('passwordHash' in user)
    )
  )
  assert.ok(db.users.every((user) => user.password_hash.startsWith('pbkdf2$')))
  assert.equal((await getDepartmentOptions())[0].children.length, 2)
  assert.equal((await getRoles({ page: 1, pageSize: 10, status: 0 })).total, 0)
  await assert.rejects(
    createUser({
      ...fields,
      username: 'invalid_department',
      password: 'rbac-password-123',
      departmentId: 999
    }),
    /请检查/
  )
  await assert.rejects(
    createUser({
      ...fields,
      username: 'invalid_roles',
      password: 'rbac-password-123',
      roleIds: [999]
    }),
    /请检查/
  )
  await assert.rejects(
    createUser({
      ...fields,
      username: 'self_super',
      password: 'rbac-password-123',
      isSuperAdmin: true
    }),
    /请检查/
  )

  const role = await createRole(roleInput)
  await assert.rejects(createRole(roleInput), /角色编码已存在/)
  await assert.rejects(createRole({ ...roleInput, code: 'bad_sort', sortOrder: -1 }), /请检查/)
  assert.deepEqual(await getRoleMenus(role.id), [])
  const grants = await grantRoleMenus(role.id, [11, 12])
  assert.deepEqual(new Set(grants), new Set([1, 10, 11, 12]))
  await assert.rejects(grantRoleMenus(role.id, [99999]), /授权节点不存在/)
  assert.deepEqual(new Set(await getRoleMenus(role.id)), new Set(grants))
  assert.ok(
    flat(await getRoleMenuOptions()).some(
      (node) => node.type === 3 && node.permission === 'system:user:create'
    )
  )

  // 按钮必须依附页面；目录不允许组件，父级修改不能形成环。
  const directory = await createMenu(menuInput)
  const page = await createMenu({
    ...menuInput,
    type: 2,
    parentId: directory.id,
    title: '权限测试页',
    path: 'cache',
    name: 'RbacCache',
    component: 'examples/cache/index',
    alwaysShow: false
  })
  const button = await createMenu({
    ...menuInput,
    type: 3,
    parentId: page.id,
    title: '查看测试页',
    path: null,
    icon: null,
    permission: 'demo:cache:read',
    alwaysShow: false
  })
  await assert.rejects(
    createMenu({ ...menuInput, path: '/wrong', component: 'examples/cache/index' }),
    /目录不配置组件/
  )
  await assert.rejects(
    createMenu({
      ...menuInput,
      type: 3,
      parentId: directory.id,
      path: null,
      permission: 'bad:parent'
    }),
    /按钮必须归属页面/
  )
  await assert.rejects(
    createMenu({
      ...menuInput,
      path: '/duplicate',
      name: 'SystemUser',
      type: 2,
      component: 'examples/cache/index'
    }),
    /路由名称已存在/
  )
  await assert.rejects(
    createMenu({
      ...menuInput,
      path: '/system/user',
      type: 2,
      name: 'PathConflict',
      component: 'examples/cache/index'
    }),
    /完整路径冲突/
  )
  await assert.rejects(
    createMenu({ ...menuInput, type: 3, parentId: page.id, path: null, permission: '*' }),
    /有效的权限码/
  )
  await assert.rejects(
    updateMenu(directory.id, { ...menuInput, parentId: directory.id }),
    /自己或后代/
  )
  await assert.rejects(deleteMenu(directory.id), /请先删除子节点/)
  const nested = await createMenu({
    ...menuInput,
    parentId: directory.id,
    path: 'nested',
    title: '嵌套目录'
  })
  await assert.rejects(
    updateMenu(directory.id, { ...menuInput, parentId: nested.id }),
    /自己或后代/
  )
  const loop = await createMenu({ ...menuInput, path: '/loop-test', title: '循环测试' })
  await assert.rejects(
    createMenu({ ...menuInput, parentId: loop.id, path: 'child', redirect: '/loop-test' }),
    /重定向不能形成循环/
  )
  await assert.rejects(createMenu({ ...menuInput, path: '//external.test' }), /有效的路由路径/)
  await grantRoleMenus(role.id, [11, 12, button.id])

  const user = await createUser({
    ...fields,
    username: 'rbac_user',
    password: 'rbac-password-123',
    roleIds: [role.id, 3],
    email: 'rbac@example.com'
  })
  assert.deepEqual(
    user.roleIds.sort((a, b) => a - b),
    [3, role.id].sort((a, b) => a - b)
  )
  assert.equal(user.isSuperAdmin, false)
  const identity = await asUser('RBAC_USER')
  assert.deepEqual(new Set(identity.roles), new Set(['custom_operator', 'viewer']))
  assert.deepEqual(
    new Set(identity.permissions),
    new Set(['system:user:list', 'system:user:create', 'demo:cache:read'])
  )
  const routes = await getDynamicRoutes()
  assert.ok(flat(routes).some((route) => route.name === 'RbacCache'))
  assert.ok(flat(routes).every((route) => !('type' in route) && !('permission' in route)))
  assert.equal((await getUsers({ page: 1, pageSize: 10 })).total, 27)
  await assert.rejects(
    createRole({ ...roleInput, code: 'denied' }),
    (error) => error.status === 403
  )
  await assert.rejects(grantRoleMenus(role.id, [11, 12, 15]), (error) => error.status === 403)
  await assert.rejects(
    createUser({
      ...fields,
      username: 'privilege_attempt',
      password: 'rbac-password-123',
      roleIds: [1]
    }),
    (error) => error.status === 403
  )
  const child = await createUser({
    ...fields,
    username: 'no_roles_user',
    password: 'rbac-password-123'
  })
  assert.deepEqual(child.roleIds, [])

  // 隐藏不是撤权；禁用祖先节点才会使后代的路由和按钮失效。
  admin()
  await updateMenu(page.id, { ...page, visible: false })
  await asUser('rbac_user')
  assert.equal(
    flat(await getDynamicRoutes()).find((route) => route.name === 'RbacCache').hidden,
    true
  )
  assert.ok((await getUserInfo()).permissions.includes('demo:cache:read'))
  admin()
  await updateMenu(directory.id, { ...directory, status: 0 })
  await asUser('rbac_user')
  assert.ok(!(await getUserInfo()).permissions.includes('demo:cache:read'))
  assert.ok(!flat(await getDynamicRoutes()).some((route) => route.name === 'RbacCache'))
  admin()
  await updateMenu(directory.id, { ...directory, status: 1 })
  await updateRole(role.id, { ...roleInput, status: 0 })
  await asUser('rbac_user')
  assert.deepEqual((await getUserInfo()).roles, ['viewer'])
  assert.deepEqual((await getUserInfo()).permissions, ['system:user:list'])
  await assert.rejects(
    createUser({ ...fields, username: 'disabled_role_attempt', password: 'rbac-password-123' }),
    (error) => error.status === 403
  )
  admin()
  await updateRole(role.id, roleInput)

  // 超级管理员标记独立于名为 admin 的角色，普通管理员没有通配符。
  const ordinaryAdmin = await createUser({
    ...fields,
    username: 'ordinary_admin',
    password: 'rbac-password-123',
    roleIds: [1]
  })
  const ordinary = await asUser('ordinary_admin')
  assert.equal(ordinary.isSuperAdmin, false)
  assert.ok(!ordinary.permissions.includes('*'))
  assert.ok(ordinary.permissions.includes('system:role:grant'))
  assert.ok(!flat(await getDynamicRoutes()).some((route) => route.name === 'RbacCache'))
  admin()
  const superUser = users.list.find((item) => item.isSuperAdmin)
  const superFields = {
    departmentId: superUser.departmentId,
    displayName: superUser.displayName,
    avatar: superUser.avatar,
    email: superUser.email,
    mobile: superUser.mobile,
    status: 1,
    roleIds: []
  }
  await updateUser(superUser.id, superFields)
  assert.deepEqual((await getUserInfo()).permissions, ['*'])
  await assert.rejects(updateUser(superUser.id, { ...superFields, status: 0 }), /超级管理员/)
  await assert.rejects(deleteUser(superUser.id), /超级管理员/)
  await deleteUser(ordinaryAdmin.id)

  // 新用户禁用/删除后，原 Token 和密码登录都会失效。
  const newUserToken = (await login({ username: 'rbac_user', password: 'rbac-password-123' }))
    .accessToken
  await updateUser(user.id, { ...fields, status: 0, email: user.email, roleIds: [role.id, 3] })
  tokenStorage.set(newUserToken)
  await assert.rejects(getUserInfo(), (error) => error.code === 10002)
  await assert.rejects(
    login({ username: 'rbac_user', password: 'rbac-password-123' }),
    /用户名或密码错误/
  )
  admin()
  await updateUser(user.id, { ...fields, email: user.email, roleIds: [role.id, 3] })
  await assert.rejects(deleteRole(role.id), /角色已关联用户/)
  await updateUser(user.id, { ...fields, email: user.email, roleIds: [3] })
  await deleteRole(role.id)
  assert.ok(db.roles.find((item) => item.id === role.id).deleted_at)
  await assert.rejects(createRole(roleInput), /角色编码已存在/)
  await deleteUser(user.id)
  assert.ok(db.users.find((item) => item.id === user.id).deleted_at)
  await assert.rejects(
    createUser({ ...fields, username: 'rbac_user', password: 'rbac-password-123' }),
    /用户名已存在/
  )
  await assert.rejects(
    createUser({
      ...fields,
      username: 'reserved_email',
      password: 'rbac-password-123',
      email: user.email
    }),
    /邮箱已被使用/
  )
  tokenStorage.set(newUserToken)
  await assert.rejects(getUserInfo(), (error) => error.code === 10002)
  admin()
  await deleteMenu(button.id)
  assert.ok(db.menus.find((item) => item.id === button.id).deleted_at)
  await assert.rejects(
    createMenu({
      ...menuInput,
      type: 3,
      parentId: page.id,
      path: null,
      permission: button.permission
    }),
    /权限码已存在/
  )

  // 授权目录本身不会扩张为其全部后代。
  const emptyRole = await createRole({ ...roleInput, code: 'directory_only' })
  await grantRoleMenus(emptyRole.id, [1])
  await createUser({
    ...fields,
    username: 'directory_only_user',
    password: 'rbac-password-123',
    roleIds: [emptyRole.id]
  })
  await asUser('directory_only_user')
  assert.deepEqual((await getUserInfo()).permissions, [])
  assert.deepEqual(await getDynamicRoutes(), [])

  // 刷新会话后撤销旧页面与缓存；当前地址失去权限时回到首页。
  resetMockDatabase()
  admin()
  const router = createStubRouter(constantRoutes)
  setupAuthGuard(router)
  const session = getSession(router)
  await session.signIn({ username: 'viewer', password: '123456' })
  await router.push('/system/user?tab=details#row')
  const viewerId = 2
  db.userRoles = db.userRoles.filter((link) => link.user_id !== viewerId)
  assert.equal(await session.refreshAuthorization(), true)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(router.currentRoute.value.path, '/dashboard')
  assert.deepEqual(permissions.permissions, [])
  db.userRoles.push({ user_id: viewerId, role_id: 3, created_at: new Date().toISOString() })
  assert.equal(await session.refreshAuthorization(), true)
  assert.equal(router.hasRoute('SystemUser'), true)
  assert.ok(permissions.permissions.includes('system:user:list'))
  db.users.find((user) => user.id === viewerId).status = 0
  await assert.rejects(session.refreshAuthorization(), (error) => error.code === 10002)
  assert.equal(router.currentRoute.value.path, '/login')
  assert.equal(tokenStorage.get(), null)
  assert.equal(router.hasRoute('SystemUser'), false)
  assert.equal(permissions.ready, false)
  session.clearSession()
  resetMockDatabase()

  // 两个管理页面的控制器使用同一权限判定，加载与写操作均受控。
  admin()
  for (const factory of [useRoleManagement, useMenuManagement]) {
    const scope = effectScope()
    scopes.push(scope)
    const model = scope.run(factory)
    await model.load()
    assert.ok(model.rows.value.length)
    permissions.setPermissions([])
    await model.load()
    assert.equal(model.rows.value.length, 0)
    permissions.setPermissions(['*'])
  }
  console.log(
    '通过：SQL 六表映射、多角色权限合并、角色授权、菜单校验、禁用继承、软删除唯一性、超级管理员标记、新用户登录及会话权限刷新。'
  )
} finally {
  scopes.forEach((scope) => scope.stop())
  await server.close()
}
