import type { RouteComponent, RouteMeta, RouteRecordRaw } from 'vue-router'
import type { DynamicRoute } from '@/api/types/route'
import { compareRouteOrder, joinRoutePath } from './path'
import { demoViews } from 'virtual:admin-examples'

// 只有页面入口可被后端引用，页面内部的表单等组件不参与动态路由。
const viewModules = {
  ...import.meta.glob<RouteComponent>(['/src/views/**/index.vue', '!/src/views/**/components/**']),
  ...demoViews
}

export function transformDynamicRoutes(routes: readonly DynamicRoute[]): RouteRecordRaw[] {
  return routes
    .map(transformDynamicRoute)
    .sort((a, b) => compareRouteOrder(a.meta ?? {}, b.meta ?? {}))
}

function transformDynamicRoute(route: DynamicRoute): RouteRecordRaw {
  validateDynamicRoute(route)
  const children = route.children?.length ? transformDynamicRoutes(route.children) : undefined
  const meta = createRouteMeta(route)
  const identity = { path: route.path, ...(route.name ? { name: route.name } : {}), meta }

  if (route.component) {
    return {
      ...identity,
      name: route.name!,
      component: resolveViewComponent(route.component),
      ...(children ? { children } : {})
    }
  }
  if (children) {
    // 无 component 的目录不增加 RouterView 层级，让主内容区直接缓存页面。
    return {
      ...identity,
      children,
      redirect:
        route.redirect ??
        ((to) => ({
          path: joinRoutePath(to.path, children[0]!.path),
          query: to.query,
          hash: to.hash
        }))
    }
  }
  return { ...identity, redirect: route.redirect! }
}

function createRouteMeta(route: DynamicRoute): RouteMeta {
  const { title, icon, hidden, keepAlive, fixedTab, alwaysShow, activeMenu, routeQuery, order } =
    route
  // 省略 undefined，保留 Vue Router 对父级 meta 的继承行为。
  return Object.fromEntries(
    Object.entries({
      title,
      icon,
      hidden,
      keepAlive,
      fixedTab,
      alwaysShow,
      activeMenu,
      routeQuery,
      order
    }).filter(([, value]) => value !== undefined)
  )
}

function resolveViewComponent(component: string): RouteComponent {
  const normalized = component.trim()
  if (
    !/^[a-zA-Z0-9_/-]+$/.test(normalized) ||
    normalized.startsWith('/') ||
    /^(?:src|views)\//.test(normalized) ||
    normalized.includes('//')
  ) {
    throw new Error(
      `[Router] Invalid dynamic route component: "${component}". Use a views-relative page path such as "system/user/index".`
    )
  }
  const modulePath = `/src/views/${normalized}.vue`
  const view = viewModules[modulePath]
  if (!view)
    throw new Error(
      `[Router] Dynamic route component not found: "${component}". Expected page: "${modulePath}".`
    )
  return view
}

function validateDynamicRoute(route: DynamicRoute): void {
  if (typeof route.path !== 'string' || !route.path.trim() || route.path !== route.path.trim()) {
    throw new Error('[Router] Dynamic route path must be a non-empty, trimmed string.')
  }
  if (typeof route.title !== 'string' || !route.title.trim()) {
    throw new Error(`[Router] Dynamic route title cannot be empty: "${route.path}".`)
  }
  if (route.name !== undefined && (typeof route.name !== 'string' || !route.name.trim())) {
    throw new Error(`[Router] Invalid route name: "${route.path}".`)
  }
  if (route.component && !route.name)
    throw new Error(`[Router] Page route "${route.path}" must have a route name.`)
  if (!route.component && !route.children?.length && !route.redirect) {
    throw new Error(
      `[Router] Dynamic route "${route.path}" must provide component, children, or redirect.`
    )
  }
  if (route.component && route.redirect) {
    throw new Error(
      `[Router] Dynamic route "${route.path}" cannot provide both component and redirect.`
    )
  }
}
