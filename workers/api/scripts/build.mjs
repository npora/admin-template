import { build } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
await build({
  configFile: false,
  root,
  build: {
    target: 'es2022',
    minify: false,
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('../src/index.mjs', import.meta.url)),
      formats: ['es'],
      fileName: () => 'worker.js'
    }
  }
})
