import type { App } from 'vue'
import { i18n } from '@/locales'
import { useLocaleStore } from '@/store/modules/locale'

import { setupDirectives } from '@/directives'
import { setupRouter } from '@/router'
import { pinia, setupStore } from '@/store'
import { useAppStore } from '@/store/modules/app'

export function setupApp(app: App): void {
  setupStore(app)
  useLocaleStore(pinia).restoreLocale()
  app.use(i18n)
  const appStore = useAppStore(pinia)
  appStore.setup()
  setupDirectives(app)
  const stopRouter = setupRouter(app)
  app.onUnmount(() => {
    appStore.dispose()
    stopRouter()
  })
}
