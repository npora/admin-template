import assert from 'node:assert/strict'
import { test } from 'node:test'
import proxy from '../worker.mjs'

test('API proxy preserves payload, query, bearer authentication and error status', async () => {
  let forwarded
  const env = {
    API_PREFIX: '/api',
    API: {
      async fetch(request) {
        forwarded = request
        assert.deepEqual(await request.json(), { username: 'example', password: 'test-only' })
        return Response.json({ code: 10001, message: 'Unauthorized', data: null }, { status: 401 })
      }
    }
  }
  const response = await proxy.fetch(
    new Request('https://demo.example/api/auth/login?source=demo', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        Origin: 'https://demo.example',
        Cookie: 'private=cookie',
        'X-Forwarded-Host': 'untrusted.example'
      },
      body: JSON.stringify({ username: 'example', password: 'test-only' })
    }),
    env
  )
  assert.equal(forwarded.url, 'https://api.internal/auth/login?source=demo')
  assert.equal(forwarded.method, 'POST')
  assert.equal(forwarded.redirect, 'manual')
  assert.equal(forwarded.headers.get('authorization'), 'Bearer test-token')
  for (const header of ['origin', 'cookie', 'x-forwarded-host'])
    assert.equal(forwarded.headers.get(header), null)
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json()).code, 10001)
})

test('only the configured API path boundary can reach the bound service', async () => {
  let calls = 0
  const env = {
    API: {
      fetch: async () => {
        calls++
        return new Response('api')
      }
    }
  }
  for (const path of ['/dashboard', '/apix/auth/user', '/assets/missing.js']) {
    const result = await proxy.fetch(new Request(`https://demo.example${path}`), env)
    assert.equal(result.status, 404)
  }
  assert.equal(calls, 0)
  assert.equal(
    await (await proxy.fetch(new Request('https://demo.example/api'), env)).text(),
    'api'
  )
  assert.equal(calls, 1)
})

test('custom API prefix is stripped without accepting a caller-selected destination', async () => {
  let target
  const result = await proxy.fetch(
    new Request('https://demo.example/backend//evil.example/users?q=1'),
    {
      API_PREFIX: '/backend',
      API: {
        fetch: async (request) => {
          target = request.url
          return new Response(null, { status: 204 })
        }
      }
    }
  )
  assert.equal(target, 'https://api.internal//evil.example/users?q=1')
  assert.equal(result.status, 204)
})

test('upstream unavailability returns uncached JSON rather than the SPA shell', async () => {
  const log = console.error
  const events = []
  console.error = (message) => events.push(JSON.parse(message))
  try {
    const response = await proxy.fetch(new Request('https://demo.example/api/auth/user'), {
      API: {
        fetch: async () => {
          throw new Error('internal service details')
        }
      }
    })
    assert.equal(response.status, 502)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), {
      code: 502,
      message: 'API service unavailable',
      data: null
    })
    assert.deepEqual(events, [{ event: 'api_proxy_failed' }])
  } finally {
    console.error = log
  }
})
