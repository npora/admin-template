import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { STORAGE_KEYS, STORAGE_PREFIX } from '../src/constants/storage.ts'

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )

/** Inline the small first-paint screen, independently of application chunks and API requests. */
export function appLoading(root: string, title: string): Plugin {
  const paths = ['loading.html', 'loading.css', 'loading.js'].map((name) =>
    resolve(root, 'src/startup', name)
  )
  return {
    name: 'app-startup-loading',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const [markup, css, runtime] = paths.map((path) => readFileSync(path, 'utf8'))
        const content = markup!.replace(/\{\{(title|initial)\}\}/g, (_, key: string) =>
          escapeHtml(key === 'title' ? title : Array.from(title)[0] || 'N')
        )
        return {
          html: html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`),
          tags: [
            { tag: 'style', attrs: { id: 'app-loading-style' }, children: css, injectTo: 'head' },
            {
              tag: 'div',
              attrs: {
                id: 'app-loading',
                role: 'status',
                'aria-live': 'polite',
                'aria-atomic': 'true',
                'data-settings-key': `${STORAGE_PREFIX}${STORAGE_KEYS.APP_SETTINGS}`
              },
              children: content,
              injectTo: 'body-prepend'
            },
            { tag: 'script', children: runtime, injectTo: 'body-prepend' }
          ]
        }
      }
    },
    handleHotUpdate(context) {
      if (paths.includes(context.file)) {
        context.server.ws.send({ type: 'full-reload' })
        return []
      }
    }
  }
}
