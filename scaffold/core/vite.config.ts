import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { coreConfig } from './build/vite.ts'
export default defineConfig((context) => {
  const root = fileURLToPath(new URL('./', import.meta.url))
  return coreConfig(root, context, loadEnv(context.mode, root))
})
