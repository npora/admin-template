import worker from '../../src/index.mjs'
import { hashPassword } from '../../src/security/crypto.mjs'
import { database } from './database.mjs'
export const password = 'Test-only-password-2026'
const pepper = 'a1'.repeat(32)
const passwordHash = await hashPassword(password, pepper)
export async function service(t) {
  const storage = database()
  t.after(() => storage.close())
  storage.sqlite
    .prepare(
      `INSERT INTO sys_user(id, department_id, username, password_hash, display_name, is_super_admin)
    VALUES(1,2,'admin',?,'Admin',1),(2,3,'viewer',?,'Viewer',0),(3,2,'editor',?,'Editor',0)`
    )
    .run(passwordHash, passwordHash, passwordHash)
  storage.sqlite.exec('INSERT INTO sys_user_role(user_id,role_id) VALUES(1,1),(2,3),(3,2)')
  const env = { DB: storage.db, AUTH_PEPPER: pepper, CORS_ORIGINS: 'http://localhost:3000' }
  let admin
  async function call(path, { method = 'GET', json, token = admin, headers = {} } = {}) {
    const response = await worker.fetch(
      new Request(`https://api.example.test${path}`, {
        method,
        headers: {
          'CF-Connecting-IP': '192.0.2.1',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers
        },
        ...(json !== undefined ? { body: JSON.stringify(json) } : {})
      }),
      env
    )
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      response
    }
  }
  const login = (username, value = password) =>
    call('/auth/login', { method: 'POST', json: { username, password: value }, token: null })
  admin = (await login('admin')).body.data.accessToken
  const viewer = (await login('viewer')).body.data.accessToken
  const editor = (await login('editor')).body.data.accessToken
  return { ...storage, env, call, login, admin, viewer, editor }
}
export const userInput = (extra = {}) => ({
  departmentId: 2,
  displayName: 'Test user',
  avatar: null,
  email: null,
  mobile: null,
  status: 1,
  roleIds: [3],
  username: 'new_user',
  password,
  ...extra
})
export const userFields = (extra = {}) => {
  const { username: _username, password: _password, ...input } = userInput(extra)
  return input
}
export const roleInput = (extra = {}) => ({
  code: 'test_role',
  name: 'Test role',
  description: null,
  sortOrder: 100,
  status: 1,
  ...extra
})
export const departmentInput = (extra = {}) => ({
  parentId: 1,
  name: 'Test department',
  code: 'test_department',
  leader: null,
  phone: null,
  email: null,
  sortOrder: 100,
  status: 1,
  ...extra
})
export const menuInput = (extra = {}) => ({
  parentId: null,
  type: 2,
  title: 'Test page',
  name: 'TestPage',
  path: '/test-page',
  component: 'examples/cache/index',
  redirect: null,
  routeQuery: null,
  activeMenu: null,
  icon: null,
  permission: null,
  visible: true,
  alwaysShow: false,
  keepAlive: true,
  fixedTab: false,
  sortOrder: 100,
  status: 1,
  ...extra
})
