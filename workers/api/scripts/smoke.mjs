import { readFile } from 'node:fs/promises'

const target = process.argv.slice(2).find((value) => value !== '--')
if (!target) throw new Error('请传入测试 Worker 地址或本地 /api 代理地址')
const url = new URL(target)
if (
  url.protocol !== 'https:' &&
  !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
)
  throw new Error('远程服务必须使用 HTTPS；仅本机代理允许 HTTP')
const base = url.origin + url.pathname.replace(/\/$/, '')
const { accounts } = JSON.parse(
  await readFile(new URL('../.local/credentials.json', import.meta.url), 'utf8')
)
const tokens = []
const check = (condition, label) => {
  if (!condition) throw new Error(label)
}
async function call(path, { method = 'GET', json, token, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...(json ? { body: JSON.stringify(json) } : {})
  })
  return { response, body: response.status === 204 ? null : await response.json() }
}
try {
  const health = await call('/health')
  check(health.response.ok && health.body.data?.database === 'connected', 'D1 健康检查失败')
  check((await call('/auth/user')).response.status === 401, '未登录访问未被拒绝')
  const wrong = await call('/auth/login', {
    method: 'POST',
    json: { username: 'nonexistent_smoke_account', password: 'wrong' }
  })
  check(wrong.response.status === 401 && wrong.body.code === 10001, '无效账号检查失败')
  for (const username of ['admin', 'viewer']) {
    const signed = await call('/auth/login', {
      method: 'POST',
      json: { username, password: accounts[username] }
    })
    check(
      signed.response.ok && /^[a-f0-9]{64}$/.test(signed.body.data?.accessToken),
      `${username} 登录失败，HTTP ${signed.response.status}`
    )
    const token = signed.body.data.accessToken
    tokens.push(token)
    const user = await call('/api/auth/user', { token })
    const routes = await call('/auth/routes', { token })
    check(user.response.ok && user.body.data?.username === username, `${username} 用户资料失败`)
    check(routes.response.ok && routes.body.data[0]?.path === '/system', `${username} 动态菜单失败`)
    if (username === 'admin')
      check(
        user.body.data.isSuperAdmin && user.body.data.permissions.includes('*'),
        '超级管理员权限失败'
      )
    else {
      check(
        !user.body.data.isSuperAdmin &&
          JSON.stringify(user.body.data.permissions) === JSON.stringify(['system:user:list']),
        '只读权限失败'
      )
      check(
        routes.body.data[0].children.length === 1 &&
          routes.body.data[0].children[0].name === 'SystemUser',
        '只读菜单隔离失败'
      )
    }
    check((await call('/auth/logout', { method: 'POST', token })).response.ok, '退出撤销失败')
    check(
      (await call('/auth/routes', { token })).response.status === 401,
      '退出后的 Token 仍然有效'
    )
    console.log(`通过：${username} 线上登录、资料、菜单权限与退出撤销。`)
  }
  const preflight = await call('/auth/login', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' }
  })
  check(
    preflight.response.status === 204 &&
      preflight.response.headers.get('Access-Control-Allow-Origin') === 'http://localhost:3000',
    '本地来源 CORS 检查失败'
  )
  check(
    (await call('/health', { headers: { Origin: 'https://untrusted.example.test' } })).response
      .status === 403,
    '来源限制失败'
  )
  console.log('通过：真实 D1、Workers 加密运行时、认证失败及 CORS 边界。')
} finally {
  await Promise.allSettled(tokens.map((token) => call('/auth/logout', { method: 'POST', token })))
}
