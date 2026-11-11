import type { App } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { createRouter, createWebHistory } from 'vue-router'

import { setupRequestErrorHandling } from './request-errors'
import { setupRouterGuards } from './guards'
import { constantRoutes } from './routes'
import { setupNavigationLoading } from './navigation-loading'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: constantRoutes,

  scrollBehavior() {
    return {
      top: 0,
      left: 0
    }
  }
})

export function setupRouter(app: App): () => void {
  const stopLoading = setupNavigationLoading(router)
  const stopErrors = setupRequestErrorHandling(router, (message) => {
    ElMessage.error({ message, grouping: true })
  })
  const stopGuards = setupRouterGuards(router)

  app.use(router)
  return () => {
    stopLoading()
    stopGuards()
    stopErrors()
  }
}
