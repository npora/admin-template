import type { RouteComponent, RouteRecordRaw } from 'vue-router'
// Extension point for application-specific pages and dashboard.
export const demoRoutes: RouteRecordRaw[] = []
export const demoViews: Record<string, () => Promise<RouteComponent>> = {}
export const demoDashboard: (() => Promise<RouteComponent>) | undefined = undefined
