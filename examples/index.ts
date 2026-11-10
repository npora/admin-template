import type { RouteComponent, RouteRecordRaw } from 'vue-router'

export const demoDashboard = () => import('./pages/dashboard/index.vue')
export const demoRoutes: RouteRecordRaw[] = [
  {
    path: 'examples/form',
    name: 'ExampleForm',
    component: () => import('./pages/form/index.vue'),
    meta: { title: '表单示例', icon: 'edit', keepAlive: true, order: 20 }
  }
]

// 保持演示后端既有 component 契约；内部弹窗不作为路由入口。
export const demoViews = Object.fromEntries(
  Object.entries(
    import.meta.glob<RouteComponent>([
      './pages/**/index.vue',
      '!./pages/**/components/**',
      '!./pages/dashboard/**'
    ])
  ).map(([path, loader]) => [`/src/views/examples/${path.slice('./pages/'.length)}`, loader])
)
