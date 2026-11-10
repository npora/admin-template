import { request } from '../client'
import type { ManagedMenu, MenuInput } from '../types/menu'

export async function getMenus(signal?: AbortSignal): Promise<ManagedMenu[]> {
  return request.get<ManagedMenu[]>('/system/menus', { signal })
}
export async function createMenu(input: MenuInput): Promise<ManagedMenu> {
  return request.post<ManagedMenu>('/system/menus', { json: input })
}
export async function updateMenu(id: number, input: MenuInput): Promise<ManagedMenu> {
  return request.put<ManagedMenu>(`/system/menus/${id}`, {
    json: input,
    extensions: { retry: 0 }
  })
}
export async function deleteMenu(id: number): Promise<void> {
  await request.delete<null>(`/system/menus/${id}`, {
    extensions: { retry: 0 }
  })
}
