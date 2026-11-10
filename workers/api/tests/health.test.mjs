import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../src/index.mjs'

// 绑定替身只验证分发和错误边界；真实 D1 连接仍需部署后检查 /health。
const env = {
  DB: {
    prepare(sql) {
      assert.equal(sql, 'SELECT 1 AS ok')
      return { first: async () => ({ ok: 1 }) }
    }
  }
}
const request = (path, method = 'GET') => new Request(`https://example.test${path}`, { method })

test('health probes the DB binding and preserves the API envelope', async () => {
  for (const path of ['/health', '/api/health']) {
    const response = await worker.fetch(request(path), env)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.deepEqual(await response.json(), {
      code: 0,
      message: 'success',
      data: { database: 'connected' }
    })
  }
})

test('unknown routes and unsupported methods do not touch the database', async () => {
  assert.equal((await worker.fetch(request('/unknown'), {})).status, 404)
  const response = await worker.fetch(request('/health', 'POST'), {})
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('Allow'), 'GET')
})

test('missing or failed D1 bindings return a sanitized 503', async (t) => {
  t.mock.method(console, 'error', () => {})
  for (const binding of [
    {},
    {
      DB: {
        prepare: () => {
          throw new Error('private database details')
        }
      }
    },
    { DB: { prepare: () => ({ first: async () => null }) } }
  ]) {
    const response = await worker.fetch(request('/health'), binding)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      code: 503,
      message: 'Database unavailable',
      data: null
    })
  }
})
