import { request } from '../client'
import type { PermissionPreview } from '../types/permission-preview'

export function getPermissionPreview(userId: number, signal?: AbortSignal) {
  return request.get<PermissionPreview>(`/system/users/${userId}/permission-preview`, { signal })
}
