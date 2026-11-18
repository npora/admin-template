import { randomUUID } from 'node:crypto'
import type { Plugin } from 'vite'

export function pwaUpdate(): Plugin {
  return {
    name: 'pwa-update',
    apply: 'build',
    generateBundle() {
      if (this.environment.name !== 'client') return
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Build: ${randomUUID()}
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
`
      })
    }
  }
}
