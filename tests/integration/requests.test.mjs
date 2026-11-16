import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTestServer, installMemoryStorage } from '../helpers/environment.mjs'

test('business clients unwrap once over Fetch, preserve metadata and reject invalid protocols', async (t) => {
  installMemoryStorage()
  const server = await createTestServer()
  t.after(() => server.close())
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const calls = []
  let body = { code: 0, message: 'success', data: { code: 7, data: 'nested DTO' } }
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init })
    return Response.json(body, { headers: { 'x-request-id': 'request-test' } })
  }
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { request, publicRequest } = await load('api/client.ts')
  const { tokenStorage } = await load('api/auth/token-storage.ts')
  const { setRequestErrorHandler, handleRequestError } = await load('api/errors/handling.ts')
  const failures = []
  const stop = setRequestErrorHandler((error, context) => failures.push({ error, context }))
  t.after(stop)
  tokenStorage.set('test-token')

  assert.deepEqual(await request.get('/example', { query: { page: 2 } }), body.data)
  assert.ok(calls[0].url.endsWith('/api/example?page=2'))
  assert.equal(new Headers(calls[0].init.headers).get('authorization'), 'Bearer test-token')
  const response = await request.getResponse('/example')
  assert.deepEqual(response.data, body.data)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-request-id'), 'request-test')
  assert.deepEqual(await response.raw.json(), body)

  const { login } = await load('api/modules/auth.ts')
  body = { code: 0, message: 'success', data: { token: 'new-token' } }
  assert.deepEqual(await login({ username: 'admin', password: '123456' }), body.data)
  assert.deepEqual(JSON.parse(calls.at(-1).init.body), { username: 'admin', password: '123456' })
  assert.equal(new Headers(calls.at(-1).init.headers).get('authorization'), null)

  for (const invalid of [
    null,
    [],
    {},
    { code: true, message: 'ok', data: {} },
    { code: 0, data: {} }
  ]) {
    body = invalid
    const before = calls.length
    await assert.rejects(request.get('/invalid'), (error) => error.code === 'API_RESPONSE_INVALID')
    assert.equal(calls.length - before, 1, 'invalid contracts must not be retried')
  }
  body = { code: 10001, message: '名称已经存在', data: null }
  const before = calls.length
  const failure = await request
    .put('/business', { json: {}, extensions: { retry: 0 } })
    .catch((e) => e)
  assert.equal(failure.code, 10001)
  assert.equal(failure.message, '名称已经存在')
  assert.equal(calls.length - before, 1)
  const noticeCount = failures.length
  handleRequestError(failure)
  assert.equal(failures.length, noticeCount, 'catch handlers must not report an error twice')
  await assert.rejects(publicRequest.post('/business', { context: { silentError: true } }))
  assert.equal(failures.at(-1).context.authenticated, false)
  assert.equal(failures.at(-1).context.silent, true)
})

test('read retries settle once while writes and cancelled requests never replay', async (t) => {
  installMemoryStorage()
  const server = await createTestServer()
  t.after(() => server.close())
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const { request } = await server.ssrLoadModule('/src/api/client.ts')
  const { setRequestErrorHandler, isCancelledRequest } = await server.ssrLoadModule(
    '/src/api/errors/handling.ts'
  )
  const failures = []
  t.after(setRequestErrorHandler((error) => failures.push(error)))
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return calls === 1
      ? Response.json({ message: 'temporary' }, { status: 503 })
      : Response.json({ code: 0, message: 'success', data: 'recovered' })
  }
  assert.equal(
    await request.get('/retry', { extensions: { retry: { delay: 0, jitter: false } } }),
    'recovered'
  )
  assert.equal(calls, 2)
  assert.equal(failures.length, 0, 'a recovered read must not display a transient failure')

  for (const method of ['post', 'put', 'patch', 'delete']) {
    for (const networkFailure of [false, true]) {
      calls = 0
      globalThis.fetch = async () => {
        calls += 1
        if (networkFailure) throw new TypeError('connection closed')
        return Response.json({ message: 'temporary' }, { status: 503 })
      }
      const before = failures.length
      await assert.rejects(request[method]('/write', { json: { value: 1 } }))
      assert.equal(calls, 1, `${method} must not replay after a transport failure`)
      assert.equal(failures.length, before + 1, 'report each final failure once')
    }
  }

  calls = 0
  const controller = new AbortController()
  globalThis.fetch = async () => {
    calls += 1
    setTimeout(() => controller.abort(), 0)
    return Response.json({ message: 'temporary' }, { status: 503 })
  }
  await assert.rejects(
    request.get('/cancel-retry', {
      signal: controller.signal,
      extensions: { retry: { delay: 100, jitter: false } }
    }),
    isCancelledRequest
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.equal(calls, 1, 'cancellation during retry delay must prevent another dispatch')
})
