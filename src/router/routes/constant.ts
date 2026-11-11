import type { RouteRecordRaw } from 'vue-router'
import { demoDashboard, demoRoutes } from '@/router/extensions'

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
        component: demoDashboard ?? (() => import('@/views/dashboard/index.vue')),
        meta: {
          title: '首页',
          icon: 'house',
          fixedTab: true,
          order: 0
        }
      },
      ...demoRoutes,
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
