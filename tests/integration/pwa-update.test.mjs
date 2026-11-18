import assert from 'node:assert/strict'
import { createTestServer } from '../helpers/environment.mjs'

const server = await createTestServer()
const original = Object.fromEntries(
  ['navigator', 'window', 'document'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key)
  ])
)

try {
  const { registerPwaUpdates } = await server.ssrLoadModule('/src/startup/pwa-update.ts')
  const url = new URL('https://example.test/admin/sw.js')
  const registration = new EventTarget()
  const serviceWorker = new EventTarget()
  const visibility = new EventTarget()
  const messages = []
  let checks = 0
  let prompts = 0
  let reloads = 0
  let accept
  let poll

  registration.update = async () => checks++
  serviceWorker.register = async (script, options) => {
    assert.equal(script.href, url.href)
    assert.deepEqual(options, { updateViaCache: 'none' })
    return registration
  }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { serviceWorker }
  })
  globalThis.window = {
    location: { origin: url.origin },
    setInterval: (callback) => {
      poll = callback
    }
  }
  globalThis.document = visibility
  await registerPwaUpdates(
    url,
    () => {
      prompts++
      return new Promise((resolve) => {
        accept = resolve
      })
    },
    () => reloads++
  )

  function install() {
    const worker = new EventTarget()
    registration.installing = worker
    registration.dispatchEvent(new Event('updatefound'))
    worker.state = 'installed'
    registration.waiting = worker
    worker.dispatchEvent(new Event('statechange'))
    return worker
  }

  const initial = install()
  assert.equal(prompts, 0, 'first installation does not prompt')
  registration.active = initial
  registration.waiting = null
  serviceWorker.controller = initial
  serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(reloads, 0, 'first controller claim does not reload')

  const dismissed = install()
  dismissed.postMessage = (message) => messages.push(message)
  assert.equal(prompts, 1)
  accept(false)
  await poll()
  assert.equal(prompts, 1, 'dismissing does not repeat the prompt for the same worker')
  assert.equal(messages.length, 0)

  const external = new EventTarget()
  registration.waiting = null
  registration.active = external
  serviceWorker.controller = external
  serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(prompts, 2, 'another tab activating the update still prompts this page')
  assert.equal(reloads, 0)
  accept(false)
  await Promise.resolve()

  const update = install()
  update.postMessage = (message) => messages.push(message)
  assert.equal(prompts, 3)
  assert.equal(messages.length, 0, 'the waiting worker is not activated before confirmation')
  accept(true)
  await Promise.resolve()
  assert.deepEqual(messages, ['SKIP_WAITING'])
  assert.equal(reloads, 0)
  serviceWorker.controller = update
  serviceWorker.dispatchEvent(new Event('controllerchange'))
  serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(reloads, 1, 'reload exactly once when the confirmed worker takes control')
  visibility.visibilityState = 'hidden'
  await poll()
  assert.equal(checks, 1, 'background tabs skip polling')
} finally {
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  await server.close()
}
