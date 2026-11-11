import { request } from '../client'
import type { PageResult } from '../types/common'
import type { ManagedRole, RoleInput, RoleListQuery, RoleOption } from '../types/role'
import type { ManagedMenu } from '../types/menu'

export async function getRoles(
  query: RoleListQuery,
  signal?: AbortSignal
): Promise<PageResult<ManagedRole>> {
  return request.get<PageResult<ManagedRole>>('/system/roles', {
    query: { ...query },
    signal
  })
}
export async function getRoleOptions(signal?: AbortSignal): Promise<RoleOption[]> {
  return request.get<RoleOption[]>('/system/roles/options', { signal })
}
export async function createRole(input: RoleInput): Promise<ManagedRole> {
  return request.post<ManagedRole>('/system/roles', { json: input })
}
export async function updateRole(id: number, input: RoleInput): Promise<ManagedRole> {
  return request.put<ManagedRole>(`/system/roles/${id}`, {
    json: input,
    extensions: { retry: 0 }
  })
}
export async function deleteRole(id: number): Promise<void> {
  await request.delete<null>(`/system/roles/${id}`, {
    extensions: { retry: 0 }
  })
}
export async function getRoleMenuOptions(): Promise<ManagedMenu[]> {
  return request.get<ManagedMenu[]>('/system/roles/menu-options')
}
export async function getRoleMenus(id: number): Promise<number[]> {
  return request.get<number[]>(`/system/roles/${id}/menus`)
}
export async function grantRoleMenus(id: number, menuIds: number[]): Promise<number[]> {
  return request.put<number[]>(`/system/roles/${id}/menus`, {
    json: { menuIds },
    extensions: { retry: 0 }
  })
}
