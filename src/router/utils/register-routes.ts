import type { RouteRecordRaw, Router } from 'vue-router'
import { joinRoutePath } from './path'

/** 先校验整棵树，避免 addRoute 静默覆盖已有路由。 */
export function registerDynamicRoutes(router: Router, routes: RouteRecordRaw[]): () => void {
  if (!router.hasRoute('Layout')) {
    throw new Error('[Router] Layout route is required.')
  }

  const names = new Set(router.getRoutes().map((route) => route.name))
  const paths = new Set(router.getRoutes().map((route) => route.path.replace(/\/$/, '') || '/'))

  function validate(items: RouteRecordRaw[], parentPath = ''): void {
    for (const route of items) {
      const normalizedPath = joinRoutePath(parentPath, route.path)

      if (paths.has(normalizedPath)) {
        throw new Error(`[Router] Duplicate route path: "${normalizedPath}".`)
      }
      paths.add(normalizedPath)

      if (route.name) {
        if (names.has(route.name)) {
          throw new Error(`[Router] Duplicate route name: "${String(route.name)}".`)
        }
        names.add(route.name)
      }
      validate(route.children ?? [], normalizedPath)
    }
  }

  validate(routes)
  const removers: (() => void)[] = []
  const remove = () =>
    removers
      .splice(0)
      .reverse()
      .forEach((dispose) => dispose())

  try {
    for (const route of routes) {
      removers.push(router.addRoute('Layout', route))
    }
  } catch (error) {
    remove()
    throw error
  }

  return remove
}
