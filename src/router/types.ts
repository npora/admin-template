import 'vue-router'
import type { DynamicRoute } from '@/api/types/route'

type PageMeta = Partial<
  Pick<
    DynamicRoute,
    | 'title'
    | 'icon'
    | 'hidden'
    | 'keepAlive'
    | 'fixedTab'
    | 'alwaysShow'
    | 'activeMenu'
    | 'routeQuery'
    | 'order'
  >
>

declare module 'vue-router' {
  interface RouteMeta extends PageMeta {
    public?: boolean
  }
}

export interface MenuItem extends Omit<PageMeta, 'title' | 'keepAlive' | 'fixedTab'> {
  path: string
  name?: string
  title: string
  children?: MenuItem[]
}
