import type {
  PermissionCode,
  RoleCode
} from './types'

export const usePermissionStore =
  defineStore(
    'permission',
    () => {
      const roles = ref<RoleCode[]>([])

      const permissions =
        ref<PermissionCode[]>([])

      const ready = ref(false)

      function setRoles(
        value: readonly RoleCode[]
      ): void {
        roles.value = [...value]
      }

      function setPermissions(
        value: readonly PermissionCode[]
      ): void {
        permissions.value = [...value]
      }

      function setReady(
        value: boolean
      ): void {
        ready.value = value
      }

      function reset(): void {
        roles.value = []
        permissions.value = []
        ready.value = false
      }

      return {
        roles,
        permissions,
        ready,

        setRoles,
        setPermissions,
        setReady,
        reset
      }
    }
  )