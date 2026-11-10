import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { constantRoutes } from '@/router/routes'
import { createMenuTree } from '@/router/utils/menu'

import type { PermissionCode, RoleCode } from './types'

export const usePermissionStore = defineStore('permission', () => {
  const roles = ref<RoleCode[]>([])

  const permissions = ref<PermissionCode[]>([])

  const ready = ref(false)
  const dynamicRoutes = shallowRef<RouteRecordRaw[]>([])
  const menus = computed(() => createMenuTree([...constantRoutes, ...dynamicRoutes.value]))
  const accessiblePageCount = computed(() => {
    const count = (routes: readonly RouteRecordRaw[]): number =>
      routes.reduce(
        (total, record) => total + (record.component ? 1 : 0) + count(record.children ?? []),
        0
      )
    const pages = constantRoutes.find((record) => record.name === 'Layout')?.children ?? []
    return count(pages) + count(dynamicRoutes.value)
  })

  function setRoutes(routes: RouteRecordRaw[]): void {
    dynamicRoutes.value = routes
  }

  function setRoles(value: readonly RoleCode[]): void {
    roles.value = [...value]
  }

  function setPermissions(value: readonly PermissionCode[]): void {
    permissions.value = [...value]
  }

  function setReady(value: boolean): void {
    ready.value = value
  }

  function reset(): void {
    roles.value = []
    permissions.value = []
    ready.value = false
    dynamicRoutes.value = []
  }

  return {
    roles,
    permissions,
    ready,
    menus,
    accessiblePageCount,
    setRoutes,

    setRoles,
    setPermissions,
    setReady,
    reset
  }
})
