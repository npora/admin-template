import { bindings, defineConfig } from 'cf/config'
import { loadEnv } from 'vite'
import { normalizeApiPrefix } from './src/config/env.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode || 'production', process.cwd(), '')
  const prefix = normalizeApiPrefix(env.VITE_API_PREFIX)
  return {
    worker: {
      name: env.CLOUDFLARE_WORKER_NAME?.trim() || 'admin-demo',
      entrypoint: './deploy/cloudflare/worker.mjs',
      compatibilityDate: '2026-11-10',
      workersDev: true,
      assets: {
        notFoundHandling: 'single-page-application',
        runWorkerFirst: [prefix, `${prefix}/*`]
      },
      env: {
        API_PREFIX: bindings.text(prefix),
        API: bindings.worker({
          worker: env.CLOUDFLARE_API_WORKER?.trim() || 'npora-admin-api-test'
        })
      },
      observability: { enabled: true, traces: { enabled: true } }
    }
  }
})
