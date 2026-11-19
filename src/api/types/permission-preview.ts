export interface PermissionPreviewRole {
  id: number
  name: string
}

export interface PermissionPreviewEntry {
  id: number
  parentId: number | null
  type: 'directory' | 'menu' | 'permission'
  title: string
  permission: string | null
  roleIds: number[]
  source: 'role' | 'inherited' | 'superAdmin'
}

export interface PermissionPreview {
  userId: number
  isSuperAdmin: boolean
  roles: PermissionPreviewRole[]
  entries: PermissionPreviewEntry[]
}
