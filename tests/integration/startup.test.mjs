import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { createTestServer } from '../helpers/environment.mjs'

const runtime = await readFile(new URL('../../src/startup/loading.js', import.meta.url), 'utf8')
function scenario({ dark = false, reduced = false, saved = null, blockedStorage = false } = {}) {
  const listeners = new Map(),
    timers = new Map()
  const element = () => {
    const events = new Map(),
      classes = new Set()
    return {
      dataset: { settingsKey: 'npora_admin_app_settings' },
      attributes: new Map(),
      textContent: '',
      hidden: true,
      removed: false,
      classList: {
        add: (key) => classes.add(key),
        contains: (key) => classes.has(key),
        toggle: (key, enabled) => (enabled ? classes.add(key) : classes.delete(key))
      },
      setAttribute(key, value) {
        this.attributes.set(key, value)
      },
      removeAttribute(key) {
        this.attributes.delete(key)
      },
      addEventListener: (key, callback) => events.set(key, callback),
      removeEventListener: (key) => events.delete(key),
      fire: (key, value = {}) => events.get(key)?.(value),
      remove() {
        this.removed = true
      }
    }
  }
  const nodes = Object.fromEntries(
    ['app-loading', 'app-loading-message', 'app-loading-retry', 'app-loading-style', 'app'].map(
      (id) => [id, element()]
    )
  )
  nodes.app.setAttribute('inert', '')
  nodes.app.setAttribute('aria-busy', 'true')
  const html = element()
  let sequence = 0,
    reloads = 0
  const window = {
    matchMedia: (query) => ({ matches: query.includes('reduced-motion') ? reduced : dark }),
    location: {
      reload: () => {
        reloads++
      }
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    setTimeout: (callback, delay) => {
      const id = ++sequence
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout: (id) => timers.delete(id)
  }
  const document = { documentElement: html, getElementById: (id) => nodes[id] }
  const localStorage = {
    getItem: () => {
      if (blockedStorage) throw new Error('Storage denied')
      return JSON.stringify(saved)
    }
  }
  runInNewContext(runtime, { window, document, localStorage })
  return {
    nodes,
    html,
    window,
    listeners,
    timers,
    get reloads() {
      return reloads
    },
    event: (name, event = {}) => listeners.get(name)?.(event),
    tick: (delay) => {
      for (const [id, timer] of [...timers])
        if (timer.delay === delay) {
          timers.delete(id)
          timer.callback()
        }
    }
  }
}
const en = {
  loading: 'Loading your workspace',
  slow: 'Please wait',
  failed: 'Unable to load',
  retry: 'Reload'
}

test('HTML includes first-paint CSS and runtime before the module entry, and escapes app titles', async () => {
  const server = await createTestServer()
  try {
    const html = await server.transformIndexHtml(
      '/',
      await readFile(new URL('../../index.html', import.meta.url), 'utf8')
    )
    assert.ok(html.includes('app-loading-style'))
    assert.ok(html.indexOf('id="app-loading"') < html.indexOf('window.__APP_STARTUP__'))
    assert.ok(html.indexOf('window.__APP_STARTUP__') < html.indexOf('src="/src/main.ts"'))
    assert.ok(html.includes('id="app" inert aria-busy="true"'))
    assert.ok(html.includes('prefers-reduced-motion'))
    assert.ok(html.includes('class="np-wave__ocean"'))
    assert.ok(html.includes('@keyframes np-ocean-drift'))
    assert.ok(!html.includes('startup-progress'))
    assert.ok(!html.includes('{{wave}}'))
    const { appLoading } = await server.ssrLoadModule('/build/app-loading.ts')
    const plugin = appLoading(fileURLToPath(new URL('../../', import.meta.url)), '<unsafe & title>')
    const transformed = plugin.transformIndexHtml.handler('<title>old</title>')
    assert.ok(transformed.html.includes('&lt;unsafe &amp; title&gt;'))
    assert.ok(!transformed.tags.find((tag) => tag.tag === 'div').children.includes('<unsafe'))
  } finally {
    await server.close()
  }
})

test('loading remains until completion, fades once, and cleans timers/listeners and keyboard lock', () => {
  const s = scenario({ saved: { theme: { mode: 'dark' } } })
  assert.equal(s.html.classList.contains('dark'), true)
  assert.equal(s.nodes['app-loading'].removed, false)
  assert.equal(s.nodes.app.attributes.has('inert'), true)
  const controller = s.window.__APP_STARTUP__
  controller.setMessages(en)
  assert.equal(s.nodes['app-loading-message'].textContent, en.loading)
  controller.complete()
  controller.complete()
  assert.equal(s.nodes['app-loading'].classList.contains('is-leaving'), true)
  assert.equal(s.nodes['app-loading'].removed, false)
  assert.equal(s.nodes.app.attributes.has('inert'), false)
  s.tick(250)
  assert.equal(s.nodes['app-loading'].removed, true)
  assert.equal(s.nodes['app-loading-style'].removed, true)
  assert.equal(s.window.__APP_STARTUP__, undefined)
  assert.equal(s.listeners.size, 0)
  assert.equal(s.timers.size, 0)
})

test('slow startup offers retry without blocking a later successful start', () => {
  const s = scenario()
  s.window.__APP_STARTUP__.setMessages(en)
  s.tick(15000)
  assert.equal(s.nodes['app-loading-retry'].hidden, false)
  assert.equal(s.nodes['app-loading-message'].textContent, en.slow)
  s.nodes['app-loading-retry'].fire('click')
  assert.equal(s.reloads, 1)
  s.window.__APP_STARTUP__.complete()
  s.nodes['app-loading'].fire('transitionend', {
    target: s.nodes['app-loading'],
    propertyName: 'opacity'
  })
  assert.equal(s.nodes['app-loading'].removed, true)
})

test('script/CSS/promise failures show retry and never uncover an unusable app', () => {
  for (const event of [
    { target: { tagName: 'SCRIPT' } },
    { target: { tagName: 'LINK', rel: 'stylesheet' } },
    { error: new Error('Startup failure') }
  ]) {
    const s = scenario()
    s.window.__APP_STARTUP__.setMessages(en)
    s.event('error', event)
    assert.equal(s.nodes['app-loading'].attributes.get('role'), 'alert')
    assert.equal(s.nodes['app-loading-message'].textContent, en.failed)
    s.window.__APP_STARTUP__.complete()
    s.tick(250)
    assert.equal(s.nodes['app-loading'].removed, false)
    assert.equal(s.nodes.app.attributes.has('inert'), true)
    s.nodes['app-loading-retry'].fire('click')
    assert.equal(s.reloads, 1)
  }
  const s = scenario()
  s.event('unhandledrejection')
  assert.equal(s.nodes['app-loading'].classList.contains('is-failed'), true)
})

test('noncritical image failures do not block startup and reduced motion removes without animation', () => {
  const s = scenario({ dark: true, reduced: true, blockedStorage: true })
  assert.equal(s.html.classList.contains('dark'), true)
  s.event('error', { target: { tagName: 'IMG' } })
  s.event('error', { target: { tagName: 'LINK', rel: 'icon' } })
  s.window.__APP_STARTUP__.complete()
  assert.equal(s.nodes['app-loading'].removed, true)
  assert.equal(s.timers.size, 0)
  const light = scenario({ dark: true, saved: { theme: { mode: 'light' } } })
  assert.equal(light.html.classList.contains('dark'), false)
})
