import { translateErrorMessage } from '@/locales/errors'
import type { RouteLocationNormalized, Router } from 'vue-router'

import { getTokenVersion, tokenStorage } from '@/api/auth/token-storage'
import {
  getRequestErrorMessage,
  isCancelledRequest,
  isUnauthorizedError,
  setRequestErrorHandler
} from '@/api/errors/handling'
import { getSession } from '@/services/session'
import { pinia } from '@/store'
import { usePermissionStore } from '@/store/modules/permission'

export function setupRequestErrorHandling(
  router: Router,
  notify: (message: string) => void
): () => void {
  const session = getSession(router)
  const permissions = usePermissionStore(pinia)
  let pendingRoute: RouteLocationNormalized | undefined

  const stopBefore = router.beforeEach((to) => {
    pendingRoute = to
  })
  const stopAfter = router.afterEach((to) => {
    if (pendingRoute === to) pendingRoute = undefined
  })
  const stopErrors = router.onError(() => {
    pendingRoute = undefined
  })
  const stopHandler = setRequestErrorHandler((error, context) => {
    if (isCancelledRequest(error)) return

    // 同一个 Token 值也可能属于重新登录后的新会话，必须同时校验版本。
    if (
      context &&
      (context.tokenVersion !== getTokenVersion() || context.token !== tokenStorage.get())
    )
      return

    if (context?.authenticated && isUnauthorizedError(error)) {
      const target = pendingRoute ?? router.currentRoute.value
      const restoring = !permissions.ready
      session.clearSession()
      if (!context.silent) notify(translateErrorMessage('登录状态已失效，请重新登录'))

      // 恢复会话时由认证守卫跳转，避免与当前导航相互等待或取消。
      if (target.path !== '/login' && !(restoring && pendingRoute)) {
        const redirect = target.meta.public ? undefined : target.fullPath
        void router
          .replace({
            path: '/login',
            query: redirect ? { redirect } : {}
          })
          .catch((error) => console.error('Login redirect failed:', error))
      }
      return
    }

    if (!context?.silent) notify(translateErrorMessage(getRequestErrorMessage(error)))
  })

  return () => {
    stopBefore()
    stopAfter()
    stopErrors()
    stopHandler()
  }
}
