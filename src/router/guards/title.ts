import { watch } from 'vue'
import { appConfig } from '@/config/app'
import { i18n, t, translateRouteTitle } from '@/locales'
import { isBuiltInSystemPage } from '../routes/system-pages'
import type { Router } from 'vue-router'

export function setupTitleGuard(router: Router): () => void {
  function updateTitle(): void {
    const route = router.currentRoute.value
    const title =
      route.name === 'RouteFallback' && isBuiltInSystemPage(route.path)
        ? t('error.forbidden.title')
        : translateRouteTitle(route.meta.title, route.name)
    document.title = title ? `${title} - ${appConfig.title}` : appConfig.title
  }
  const stopNavigation = router.afterEach((_to, _from, failure) => {
    if (!failure) updateTitle()
  })
  const stopLocale = watch(i18n.global.locale, updateTitle, { flush: 'sync' })
  return () => {
    stopNavigation()
    stopLocale()
  }
}
