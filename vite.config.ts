import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { coreConfig } from './build/vite.ts'
import { optionalExamples } from './build/optional-examples.ts'

export default defineConfig(async (context) => {
  const root = fileURLToPath(new URL('./', import.meta.url))
  const env = loadEnv(context.mode, root)
  const examples = optionalExamples(root, env.VITE_DEMO_ENABLED === 'true')
  const cloudflarePlugin =
    process.env.NPORA_CLOUDFLARE_BUILD === 'true'
      ? (await import('@cloudflare/vite-plugin')).cloudflare()
      : undefined
  const core = coreConfig(root, context, env)
  return {
    ...core,
    define: { ...core.define, __DEMO_ENABLED__: examples.enabled },
    plugins: [cloudflarePlugin, examples.plugin, ...(core.plugins ?? [])]
  }
})
