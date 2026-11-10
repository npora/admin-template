declare module 'virtual:admin-examples' {
  import type { RouteComponent, RouteRecordRaw } from 'vue-router'
  export const demoRoutes: RouteRecordRaw[]
  export const demoViews: Record<string, () => Promise<RouteComponent>>
  export const demoDashboard: (() => Promise<RouteComponent>) | undefined
}
