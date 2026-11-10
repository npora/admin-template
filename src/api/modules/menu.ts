import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse } from '../types/common'
import type { ManagedMenu, MenuInput } from '../types/menu'

export async function getMenus(signal?: AbortSignal): Promise<ManagedMenu[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<ManagedMenu[]>>('/system/menus', { signal })
  )
}
export async function createMenu(input: MenuInput): Promise<ManagedMenu> {
  return unwrapApiResponse(
    await request.post<DefaultApiResponse<ManagedMenu>>('/system/menus', { json: input })
  )
}
export async function updateMenu(id: number, input: MenuInput): Promise<ManagedMenu> {
  return unwrapApiResponse(
    await request.put<DefaultApiResponse<ManagedMenu>>(`/system/menus/${id}`, {
      json: input,
      extensions: { retry: 0 }
    })
  )
}
export async function deleteMenu(id: number): Promise<void> {
  unwrapApiResponse(
    await request.delete<DefaultApiResponse<null>>(`/system/menus/${id}`, {
      extensions: { retry: 0 }
    })
  )
}
