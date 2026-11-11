import { getRoles, createRole, updateRole, deleteRole } from '@/api/modules/role'
import { useManagementTable } from '@/composables/useManagementTable'
import type { ManagedRole, RoleInput } from '@/api/types/role'

export function useRoleManagement() {
  return useManagementTable<ManagedRole, RoleInput>({
    permission: 'role',
    list: getRoles,
    create: createRole,
    update: updateRole,
    remove: deleteRole
  })
}
