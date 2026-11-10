import type { RouteRecordRaw } from 'vue-router'
import type { MenuItem } from '../types'
import { compareRouteOrder, joinRoutePath } from './path'

export function createMenuTree(routes: readonly RouteRecordRaw[], parentPath = ''): MenuItem[] {
  const menus: MenuItem[] = []
  for (const route of routes) {
    if (route.meta?.hidden) continue
    const path = joinRoutePath(parentPath, route.path)
    const children = createMenuTree(route.children ?? [], path)
    const meta = route.meta

    // 无标题的 Layout 不生成菜单，但提升其 children 到当前菜单层级。
    if (!meta?.title) {
      menus.push(...children)
    } else if (children.length === 1 && !meta.alwaysShow) {
      menus.push(children[0]!)
    } else {
      menus.push({
        path,
        name: typeof route.name === 'string' ? route.name : undefined,
        title: meta.title,
        icon: meta.icon,
        alwaysShow: meta.alwaysShow,
        activeMenu: meta.activeMenu,
        routeQuery: meta.routeQuery,
        order: meta.order,
        ...(children.length ? { children } : {})
      })
    }
  }
  return menus.sort(compareRouteOrder)
}
