import { readFile, writeFile } from 'node:fs/promises'
import { randomHex } from '../src/security/crypto.mjs'

const target = process.argv.slice(2).find((value) => value !== '--')
if (!target || new URL(target).protocol !== 'https:')
  throw new Error('请传入测试 Worker 的 HTTPS 地址')
const origin = new URL(target).origin
const { accounts } = JSON.parse(
  await readFile(new URL('../.local/credentials.json', import.meta.url), 'utf8')
)
const tag = `test${randomHex(5)}`
const created = []
const tokens = []
let admin
let succeeded = false
const check = (condition, label) => {
  if (!condition) throw new Error(label)
}
async function call(path, { method = 'GET', json, token = admin } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {})
  })
  return { status: response.status, body: await response.json() }
}
function data(result, label = '接口验证失败') {
  check(result.status === 200 && result.body.code === 0, `${label}，HTTP ${result.status}`)
  return result.body.data
}
async function create(resource, json) {
  const row = data(
    await call(`/system/${resource}`, { method: 'POST', json }),
    `创建 ${resource} 失败`
  )
  created.push({ resource, id: row.id })
  await writeFile(
    new URL('../.local/management-smoke.json', import.meta.url),
    JSON.stringify({ target: origin, tag, created, completed: false }, null, 2),
    { mode: 0o600 }
  )
  return row
}
const put = (json) => ({ method: 'PUT', json })
const password = randomHex(20)
try {
  admin = data(
    await call('/auth/login', {
      method: 'POST',
      token: null,
      json: { username: 'admin', password: accounts.admin }
    }),
    '管理员登录失败'
  ).accessToken
  tokens.push(admin)
  const baseline = data(await call('/system/dashboard')).users.total
  for (const path of [
    '/system/users?page=1&pageSize=10',
    '/system/roles?page=1&pageSize=10',
    '/system/departments',
    '/system/menus',
    '/system/roles/options',
    '/system/roles/menu-options',
    '/system/departments/options'
  ])
    data(await call(path))
  const deptInput = {
    parentId: 1,
    name: '线上联调临时部门',
    code: `smoke_${tag}`,
    leader: null,
    phone: null,
    email: null,
    sortOrder: 1000,
    status: 1
  }
  const dept = await create('departments', deptInput)
  const roleInput = {
    code: `smoke_${tag}`,
    name: '线上联调临时角色',
    description: '自动验证后软删除',
    sortOrder: 1000,
    status: 1
  }
  const role = await create('roles', roleInput)
  const pageInput = {
    parentId: null,
    type: 2,
    title: '线上联调临时页面',
    name: `Smoke_${tag}`,
    path: `/smoke-${tag}`,
    component: 'examples/cache/index',
    redirect: null,
    routeQuery: { from: 'smoke' },
    activeMenu: null,
    icon: null,
    permission: null,
    visible: false,
    alwaysShow: false,
    keepAlive: false,
    fixedTab: false,
    sortOrder: 1000,
    status: 1
  }
  const page = await create('menus', pageInput)
  const buttonInput = {
    ...pageInput,
    parentId: page.id,
    type: 3,
    title: '临时权限',
    name: null,
    path: null,
    component: null,
    routeQuery: null,
    permission: `smoke:${tag}:view`
  }
  const button = await create('menus', buttonInput)
  const grant = data(
    await call(`/system/roles/${role.id}/menus`, put({ menuIds: [page.id, button.id, 11] }))
  )
  check(grant.includes(1) && grant.includes(10), '授权未补齐祖先')
  check(data(await call(`/system/roles/${role.id}/menus`)).includes(button.id), '授权读取失败')
  const username = `smoke_${tag}`
  const profile = {
    departmentId: dept.id,
    displayName: '线上联调临时用户',
    avatar: null,
    email: null,
    mobile: null,
    status: 1,
    roleIds: [role.id]
  }
  const user = await create('users', { ...profile, username, password })
  const token = data(
    await call('/auth/login', { method: 'POST', token: null, json: { username, password } }),
    '新建用户登录失败'
  ).accessToken
  tokens.push(token)
  let info = data(await call('/auth/user', { token }))
  check(
    info.permissions.includes(buttonInput.permission) && !info.isSuperAdmin,
    '新用户权限隔离失败'
  )
  check(
    data(await call('/system/users?keyword=' + username + '&roleId=' + role.id)).total === 1,
    '查询筛选失败'
  )
  const scoped = data(await call('/system/dashboard', { token }))
  check(scoped.users.total === baseline + 1 && !('roles' in scoped), '首页统计或权限隔离失败')
  check(
    (await call('/system/users', { method: 'POST', token, json: {} })).status === 403,
    '只读写入未被拒绝'
  )
  data(
    await call(`/system/departments/${dept.id}`, put({ ...deptInput, name: '线上联调更新部门' }))
  )
  const updated = data(
    await call(`/system/users/${user.id}`, put({ ...profile, displayName: '线上联调更新用户' }))
  )
  check(updated.departmentName === '线上联调更新部门', '部门资料映射失败')
  data(await call(`/system/roles/${role.id}`, put({ ...roleInput, name: '线上联调更新角色' })))
  data(await call(`/system/menus/${page.id}`, put({ ...pageInput, title: '线上联调更新页面' })))
  check(
    data(await call('/auth/routes', { token })).some((node) => node.name === pageInput.name),
    '动态菜单未生效'
  )
  check(
    (await call(`/system/departments/${dept.id}`, { method: 'DELETE' })).status === 409,
    '部门关联保护失败'
  )
  check(
    (await call(`/system/roles/${role.id}`, { method: 'DELETE' })).status === 409,
    '角色关联保护失败'
  )
  data(await call(`/system/roles/${role.id}/menus`, put({ menuIds: [] })))
  info = data(await call('/auth/user', { token }))
  check(
    info.permissions.length === 0 && data(await call('/auth/routes', { token })).length === 0,
    '实时撤权失败'
  )
  check(!('users' in data(await call('/system/dashboard', { token }))), '撤权后首页泄露用户汇总')
  console.log('通过：线上用户、部门、角色、菜单 CRUD，角色授权、实时撤权、分页筛选及首页权限隔离。')
  succeeded = true
} finally {
  const remaining = []
  for (const row of [...created].reverse()) {
    try {
      const result = await call(`/system/${row.resource}/${row.id}`, { method: 'DELETE' })
      if (![200, 404].includes(result.status)) remaining.push(row)
    } catch {
      remaining.push(row)
    }
  }
  await Promise.allSettled(tokens.map((token) => call('/auth/logout', { method: 'POST', token })))
  await writeFile(
    new URL('../.local/management-smoke.json', import.meta.url),
    JSON.stringify(
      { target: origin, tag, created, remaining, completed: succeeded && remaining.length === 0 },
      null,
      2
    ),
    { mode: 0o600 }
  )
  if (remaining.length) {
    console.error('临时测试记录尚未全部清理，ID 已保存在 .local/management-smoke.json。')
    if (succeeded) throw new Error('线上测试清理未完成')
  } else if (created.length) console.log('通过：已软删除全部临时测试记录，并撤销测试会话。')
}
