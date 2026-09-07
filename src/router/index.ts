import type { App } from 'vue'
import {
  createRouter,
  createWebHistory
} from 'vue-router'

import { setupRouterGuards } from './guards'
import { constantRoutes } from './routes'

export const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL
  ),

  routes: constantRoutes,

  scrollBehavior() {
    return {
      top: 0,
      left: 0
    }
  }
})

export function setupRouter(app: App): void {
  setupRouterGuards(router)

  app.use(router)
}