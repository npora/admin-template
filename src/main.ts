import { createApp, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'

import App from './App.vue'
import { setupApp } from './bootstrap'
import { router } from './router'
import { t } from './locales'
import { registerPwaUpdates } from './startup/pwa-update'
import type { StartupLoading } from './startup/types'
import '@/assets/styles/index.scss'

const app = createApp(App)
const loading: StartupLoading | undefined = window.__APP_STARTUP__
let mounted = false
let disposed = false
async function confirmAppUpdate(): Promise<boolean> {
  try {
    await ElMessageBox.alert(t('ui.appUpdateMessage'), t('ui.appUpdateTitle'), {
      type: 'info',
      confirmButtonText: t('ui.appUpdateRefresh'),
      closeOnClickModal: false
    })
    return true
  } catch {
    return false
  }
}

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
    if (disposed) return
    loading?.complete()
    if (import.meta.env.PROD) {
      void registerPwaUpdates(
        new URL(`${import.meta.env.BASE_URL}sw.js`, document.baseURI),
        confirmAppUpdate,
        () => window.location.reload()
      ).catch(() => undefined)
    }
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
