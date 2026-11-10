import type { Router } from 'vue-router'

import { handleRequestError } from '@/api/errors/handling'
import { tokenStorage } from '@/api/auth/token-storage'
import { getSession } from '@/services/session'

export function setupAuthGuard(router: Router): () => void {
  return router.beforeEach(async (to) => {
    const session = getSession(router)
    const token = tokenStorage.get()

    if (!token) {
      session.clearSession()
      if (to.meta.public) return true
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.meta.public && to.path !== '/login') return true

    try {
      if (await session.initialize()) {
        if (to.path === '/login') return '/'

        // 首次访问时可能先匹配到兜底路由，注册后重新解析原地址。
        if (to.name === 'RouteFallback' && router.resolve(to.fullPath).name !== 'RouteFallback') {
          return { path: to.path, query: to.query, hash: to.hash, replace: true }
        }
        return true
      }
    } catch (error) {
      handleRequestError(error)
    }

    if (to.path === '/login') return true
    return { path: '/login', query: { redirect: to.fullPath } }
  })
}
