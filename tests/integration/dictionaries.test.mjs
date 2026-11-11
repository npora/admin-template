import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { createTestServer, installMemoryStorage, waitFor } from '../helpers/environment.mjs'

test('dictionary cache coalesces requests, expires, preserves last success on errors and isolates sessions', async () => {
  installMemoryStorage()
  const server = await createTestServer()
  const originalFetch = globalThis.fetch,
    originalNow = Date.now
  const requests = []
  globalThis.fetch = (input, init) =>
    new Promise((resolve) => requests.push({ input, init, resolve }))
  const result = (request, options, status = 200) =>
    request.resolve(
      Response.json(
        status === 200
          ? { code: 0, message: 'success', data: options }
          : { code: 409, message: 'Conflict', data: null },
        { status }
      )
    )
  try {
    const { tokenStorage } = await server.ssrLoadModule('/src/api/auth/token-storage.ts')
    const { useDictStore } = await server.ssrLoadModule('/src/store/modules/dict/index.ts')
    setActivePinia(createPinia())
    tokenStorage.set('session-one')
    const store = useDictStore()
    const options = [{ label: 'Enabled', value: '1', tagType: 'success' }]
    const first = store.load('test'),
      duplicate = store.load('test')
    await waitFor(() => requests.length === 1)
    result(requests[0], options)
    assert.deepEqual(await first, options)
    assert.deepEqual(await duplicate, options)
    await store.load('test')
    assert.equal(requests.length, 1)
    let now = originalNow()
    Date.now = () => now
    now += 300001
    const expired = store.load('test')
    await waitFor(() => requests.length === 2)
    result(requests[1], options)
    await expired
    const failing = store.load('test', true)
    const rejected = assert.rejects(failing)
    await waitFor(() => requests.length === 3)
    result(requests[2], null, 409)
    await rejected
    assert.deepEqual(store.entries.get('test').options, options)
    assert.equal(store.entries.get('test').loading, false)
    assert.ok(store.entries.get('test').error)
    const stale = store.load('stale').catch(() => null)
    await waitFor(() => requests.length === 4)
    tokenStorage.set('session-two')
    store.reset()
    result(requests[3], options)
    await stale
    assert.equal(store.entries.size, 0, 'late response cannot restore another session cache')
    const fresh = store.load('test')
    await waitFor(() => requests.length === 5)
    result(requests[4], [])
    assert.deepEqual(await fresh, [])
    assert.deepEqual(await store.load('../invalid'), [])
    assert.equal(requests.length, 5)
    const { useDict } = await server.ssrLoadModule('/src/composables/useDict.ts')
    const scope = effectScope()
    const code = ref('test')
    const dictionary = scope.run(() => useDict(code))
    await nextTick()
    assert.equal(dictionary.getLabel(null), '—')
    assert.equal(dictionary.getLabel(0), '0', 'unrecognized numeric zero stays visible')
    code.value = 'other'
    await waitFor(() => requests.length === 6)
    result(requests[5], [{ label: 'Zero', value: '0', tagType: 'info' }])
    await waitFor(() => dictionary.getLabel(0) === 'Zero')
    store.reset()
    await waitFor(() => requests.length === 7)
    result(requests[6], [{ label: 'New zero', value: '0', tagType: 'warning' }])
    await waitFor(() => dictionary.getLabel(0) === 'New zero')
    scope.stop()
  } finally {
    Date.now = originalNow
    globalThis.fetch = originalFetch
    await server.close()
  }
})
