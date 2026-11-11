import { onScopeDispose, ref } from 'vue'
import { useManagementTable } from '@/composables/useManagementTable'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { createUser, deleteUser, getUsers, updateUser } from '@/api/modules/user'
import type { CreateUserInput, ManagedUser } from '@/api/types/user'
import type { SystemStatus } from '@/api/types/system'
import type { RoleOption } from '@/api/types/role'
import type { DepartmentOption } from '@/api/types/department'
import { getRoleOptions } from '@/api/modules/role'
import { getDepartmentOptions } from '@/api/modules/department'

export function useUserManagement() {
  const table = useManagementTable({
    permission: 'user',
    filters: () => ({
      keyword: '',
      roleId: undefined as number | undefined,
      departmentId: undefined as number | undefined,
      status: undefined as SystemStatus | undefined
    }),
    list: getUsers,
    create: createUser,
    update: (id: number, input: CreateUserInput) => {
      const { username: _username, password: _password, ...changes } = input
      return updateUser(id, changes)
    },
    remove: deleteUser,
    canRemove: (id: number, rows: readonly ManagedUser[]) =>
      !rows.some((user) => user.id === id && user.isSuperAdmin)
  })
  const roleOptions = ref<RoleOption[]>([])
  const departments = ref<DepartmentOption[]>([])
  const optionsLoading = ref(false)
  let disposed = false,
    version = 0,
    controller: AbortController | undefined
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  async function loadOptions(): Promise<boolean> {
    if (disposed) return false
    const current = ++version,
      token = getTokenVersion()
    controller?.abort()
    controller = new AbortController()
    optionsLoading.value = true
    try {
      const [roles, tree] = await Promise.all([
        getRoleOptions(controller.signal),
        getDepartmentOptions(controller.signal)
      ])
      if (disposed || current !== version || token !== getTokenVersion()) return false
      roleOptions.value = roles
      departments.value = tree
      return true
    } catch (error) {
      if (!disposed && current === version && token === getTokenVersion()) handleRequestError(error)
      return false
    } finally {
      if (!disposed && current === version) optionsLoading.value = false
    }
  }
  return { ...table, roleOptions, departments, optionsLoading, loadOptions }
}
