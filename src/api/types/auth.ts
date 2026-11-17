export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
  totpCode?: string
}

export interface LoginResult {
  accessToken: string
  expiresAt?: number
}

export interface AuthenticatorStatus {
  available: boolean
  enabled: boolean
}
export interface AuthenticatorSetup {
  secret: string
  uri: string
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
