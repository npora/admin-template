export interface SessionEntry {
  id: string
  createdAt: number
  expiresAt: number
  current: boolean
}

export interface SessionRevocationResult {
  revoked: number
}
