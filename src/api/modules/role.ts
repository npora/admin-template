import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse, PageResult } from '../types/common'
import type { ManagedRole, RoleInput, RoleListQuery, RoleOption } from '../types/role'
import type { ManagedMenu } from '../types/menu'

export async function getRoles(
  query: RoleListQuery,
  signal?: AbortSignal
): Promise<PageResult<ManagedRole>> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<PageResult<ManagedRole>>>('/system/roles', {
      query: { ...query },
      signal
    })
  )
}
export async function getRoleOptions(): Promise<RoleOption[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<RoleOption[]>>('/system/roles/options')
  )
}
export async function createRole(input: RoleInput): Promise<ManagedRole> {
  return unwrapApiResponse(
    await request.post<DefaultApiResponse<ManagedRole>>('/system/roles', { json: input })
  )
}
export async function updateRole(id: number, input: RoleInput): Promise<ManagedRole> {
  return unwrapApiResponse(
    await request.put<DefaultApiResponse<ManagedRole>>(`/system/roles/${id}`, {
      json: input,
      extensions: { retry: 0 }
    })
  )
}
export async function deleteRole(id: number): Promise<void> {
  unwrapApiResponse(
    await request.delete<DefaultApiResponse<null>>(`/system/roles/${id}`, {
      extensions: { retry: 0 }
    })
  )
}
export async function getRoleMenuOptions(): Promise<ManagedMenu[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<ManagedMenu[]>>('/system/roles/menu-options')
  )
}
export async function getRoleMenus(id: number): Promise<number[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<number[]>>(`/system/roles/${id}/menus`)
  )
}
export async function grantRoleMenus(id: number, menuIds: number[]): Promise<number[]> {
  return unwrapApiResponse(
    await request.put<DefaultApiResponse<number[]>>(`/system/roles/${id}/menus`, {
      json: { menuIds },
      extensions: { retry: 0 }
    })
  )
}
