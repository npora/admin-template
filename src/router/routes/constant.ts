import type { RouteRecordRaw } from 'vue-router'

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      public: true,
      hidden: true
    }
  },

  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页',
          icon: 'house',
          fixedTab: true,
          order: 0
        }
      },
      {
        path: 'examples/form',
        name: 'ExampleForm',
        component: () => import('@/views/examples/form/index.vue'),
        meta: { title: '表单示例', icon: 'edit', keepAlive: true, order: 20 }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', hidden: true }
      }
    ]
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '404',
      public: true,
      hidden: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'RouteFallback',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', hidden: true }
  }
]
