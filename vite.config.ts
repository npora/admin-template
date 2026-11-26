import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { pwaUpdate } from './build/pwa-update.ts'
import { coreConfig } from './build/vite.ts'
export default defineConfig((context) => {
  const root = fileURLToPath(new URL('./', import.meta.url))
  const core = coreConfig(root, context, loadEnv(context.mode, root))
  return { ...core, plugins: [...(core.plugins ?? []), pwaUpdate()] }
})
