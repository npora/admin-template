import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createTestServer, waitFor } from '../helpers/environment.mjs'

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('content loading skips startup and cached navigation, handles slow loads, cancellation, errors and teardown', async () => {
  const server = await createTestServer()
  try {
    const { setupNavigationLoading, useNavigationLoading } = await server.ssrLoadModule(
      '/src/router/navigation-loading.ts'
    )
    const page = { render: () => null }
    const slow = deferred(),
      broken = deferred()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'Layout',
          component: page,
          children: [
            { path: 'home', component: page },
            { path: 'slow', component: () => slow.promise },
            {
              path: 'broken',
              component: async () => {
                await broken.promise
                throw new Error('chunk failed')
              }
            },
            { path: 'cancel', component: page }
          ]
        },
        { path: '/login', component: page }
      ]
    })
    const loading = useNavigationLoading(router)
    const stop = setupNavigationLoading(router)
    const initialGate = deferred()
    const stopInitial = router.beforeEach(async () => initialGate.promise)
    const initial = router.push('/home')
    await pause(150)
    assert.equal(loading.value, false, 'initial load belongs to startup screen')
    initialGate.resolve()
    await initial
    stopInitial()
    const visit = router.push('/slow')
    await waitFor(() => loading.value)
    assert.equal(
      router.currentRoute.value.path,
      '/home',
      'previous page stays mounted during lazy load'
    )
    slow.resolve(page)
    await visit
    assert.equal(loading.value, false)
    await router.push('/home')
    await router.push('/slow')
    assert.equal(loading.value, false, 'resolved navigation does not flash a loader')

    const cancelGate = deferred()
    const stopCancel = router.beforeEach(async (to) => {
      if (to.path === '/cancel') await cancelGate.promise
    })
    const cancelled = router.push('/cancel')
    await waitFor(() => loading.value)
    const failure = router.push('/broken').catch((error) => error)
    await pause(150)
    cancelGate.resolve()
    await cancelled
    assert.equal(loading.value, true, 'old cancelled navigation cannot clear the pending loader')
    broken.resolve()
    assert.match((await failure).message, /chunk failed/)
    assert.equal(loading.value, false, 'failed lazy import clears loader')
    stopCancel()

    const teardownGate = deferred()
    const stopTeardown = router.beforeEach(async () => teardownGate.promise)
    const pending = router.push('/home')
    await waitFor(() => loading.value)
    stop()
    assert.equal(loading.value, false)
    teardownGate.resolve()
    await pending
    stopTeardown()
    await router.push('/login')
    assert.equal(loading.value, false)
  } finally {
    await server.close()
  }
})
