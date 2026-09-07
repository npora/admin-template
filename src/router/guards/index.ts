import type { Router } from 'vue-router'

export function setupRouterGuards(
  router: Router
): void {
  router.beforeEach(to => {
    const appTitle =
      import.meta.env.VITE_APP_TITLE

    document.title = to.meta.title
      ? `${to.meta.title} - ${appTitle}`
      : appTitle
  })
}