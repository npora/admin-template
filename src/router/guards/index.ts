import type { Router } from 'vue-router'

import { setupAuthGuard } from './auth'
import { setupTitleGuard } from './title'

export function setupRouterGuards(router: Router): () => void {
  const stopTitle = setupTitleGuard(router)
  const stopAuth = setupAuthGuard(router)
  return () => {
    stopAuth()
    stopTitle()
  }
}
