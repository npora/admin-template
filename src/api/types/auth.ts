export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
}

export interface UserInfoResult {
  id: number
  username: string
  displayName: string
  avatar?: string
  departmentId: number | null
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
}
