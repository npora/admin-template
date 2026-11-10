import { createApp, nextTick } from 'vue'

import App from './App.vue'
import { setupApp } from './bootstrap'
import { router } from './router'
import { t } from './locales'
import type { StartupLoading } from './startup/types'
import '@/assets/styles/index.scss'

const app = createApp(App)
const loading: StartupLoading | undefined = window.__APP_STARTUP__
let mounted = false
let disposed = false

async function start(): Promise<void> {
  try {
    setupApp(app)
    loading?.setMessages({
      loading: t('ui.startupLoading'),
      slow: t('ui.startupSlow'),
      failed: t('ui.startupFailed'),
      retry: t('ui.startupRetry')
    })
    app.mount('#app')
    mounted = true
    await router.isReady()
    await nextTick()
    if (!disposed) loading?.complete()
  } catch (error) {
    if (disposed) return
    if (mounted) {
      app.unmount()
      mounted = false
    }
    loading?.fail()
    console.error('[App] Startup failed:', error instanceof Error ? error.message : 'Unknown error')
  }
}
void start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true
    if (mounted) {
      app.unmount()
      mounted = false
    }
  })
}
