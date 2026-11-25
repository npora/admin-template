import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'
import { build, preview } from 'vite'
import worker from '../../workers/api/src/index.mjs'
import { hashPassword } from '../../workers/api/src/security/crypto.mjs'
import { database } from '../../workers/api/tests/helpers/database.mjs'

const host = '127.0.0.1'
const apiPrefix = '/api/'
const root = fileURLToPath(new URL('../../', import.meta.url))

function installLocalApi(storage, pepper, requests) {
  return {
    name: 'browser-test-worker',
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(apiPrefix)) return next()
        let task
        try {
          const origin = `http://${host}:${server.httpServer.address().port}`
          const method = req.method
          task = worker.fetch(
            new Request(new URL(req.url, origin), {
              method,
              headers: req.headers,
              ...(method === 'GET' || method === 'HEAD'
                ? {}
                : { body: Readable.toWeb(req), duplex: 'half' })
            }),
            { DB: storage.db, AUTH_PEPPER: pepper, CORS_ORIGINS: origin }
          )
          requests.add(task)
          const response = await task
          if (res.destroyed) return
          res.writeHead(response.status, Object.fromEntries(response.headers))
          if (response.body) await pipeline(Readable.fromWeb(response.body), res)
          else res.end()
        } catch {
          if (res.headersSent || res.destroyed) res.destroy()
          else next(new Error('Local browser test API request failed'))
        } finally {
          requests.delete(task)
        }
      })
    }
  }
}

export const test = base.extend({
  demoMode: [false, { option: true, scope: 'worker' }],
  dist: [
    async ({ demoMode }, use) => {
      const outDir = await mkdtemp(join(tmpdir(), 'npora-browser-'))
      try {
        // Playwright runs this fixture in its worker process.
        Object.assign(process.env, {
          VITE_API_PREFIX: '/api',
          VITE_DEMO_ENABLED: String(demoMode),
          VITE_AUTHENTICATOR_ENABLED: 'false',
          VITE_TOKEN_STORAGE: 'session',
          VITE_BUILD_COMPRESS: 'false',
          VITE_BUILD_ANALYZE: 'false',
          NPORA_CLOUDFLARE_BUILD: 'false'
        })
        await build({ root, logLevel: 'error', build: { outDir } })
        await use(outDir)
      } finally {
        await rm(outDir, { recursive: true, force: true })
      }
    },
    { scope: 'worker', timeout: 120_000 }
  ],

  app: async ({ dist, demoMode }, use) => {
    const storage = database()
    const pepper = randomBytes(32).toString('hex')
    const admin = { username: 'browser_admin', password: randomBytes(24).toString('hex') }
    const viewer = { username: 'browser_viewer', password: randomBytes(24).toString('hex') }
    const requests = new Set()
    let server
    try {
      const [adminHash, viewerHash] = await Promise.all(
        [admin, viewer].map(({ password }) => hashPassword(password, pepper))
      )
      storage.sqlite
        .prepare(
          `INSERT INTO sys_user(id, department_id, username, password_hash, display_name, is_super_admin)
          VALUES(1,2,?,?,'Browser Admin',1),(2,3,?,?,'Browser Viewer',0)`
        )
        .run(admin.username, adminHash, viewer.username, viewerHash)
      storage.sqlite.exec(`
        INSERT INTO sys_user_role(user_id,role_id) VALUES(1,1),(2,3);
      `)
      if (!demoMode)
        storage.sqlite.exec("UPDATE sys_menu SET status = 0 WHERE component LIKE 'examples/%'")
      server = await preview({
        root,
        configFile: false,
        logLevel: 'error',
        build: { outDir: dist },
        preview: { host, port: 0, strictPort: true },
        plugins: [installLocalApi(storage, pepper, requests)]
      })
      await use({ origin: `http://${host}:${server.httpServer.address().port}`, admin, viewer })
    } finally {
      try {
        await server?.close()
      } finally {
        // Preview closes sockets first, then the Worker handlers may finish a pending SQLite read.
        await Promise.allSettled(requests)
        storage.close()
      }
    }
  }
})
