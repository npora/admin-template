import { storeToRefs } from 'pinia'

import { usePermissionStore } from '@/store/modules/permission'
import { checkPermission, type PermissionMode, type PermissionValue } from '@/utils/permission'

export function usePermission() {
  const permissionStore = usePermissionStore()

  const { roles, permissions, ready } = storeToRefs(permissionStore)

  function hasPermission(value: PermissionValue, mode: PermissionMode = 'any'): boolean {
    if (!ready.value) {
      return false
    }

    return checkPermission(permissions.value, value, mode)
  }

  function hasRole(value: PermissionValue, mode: PermissionMode = 'any'): boolean {
    if (!ready.value) {
      return false
    }

    return checkPermission(roles.value, value, mode)
  }

  return {
    roles,
    permissions,
    ready,

    hasRole,
    hasPermission
  }
}
