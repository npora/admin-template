import { db } from './rbac/database'
import { getUserInfo } from './rbac/access'

const tokens = new Map<string, number>([
  ['npora-mock-access-token', 1],
  ['npora-mock-viewer-token', 2]
])
export function issueMockToken(userId: number): string {
  const token =
    userId === 1
      ? 'npora-mock-access-token'
      : userId === 2
        ? 'npora-mock-viewer-token'
        : `npora-mock-${crypto.randomUUID()}`
  tokens.set(token, userId)
  return token
}
export function getMockUser(headers?: HeadersInit) {
  const token = new Headers(headers).get('authorization')?.replace(/^Bearer /, '') ?? ''
  const id = tokens.get(token)
  return db.users.find((user) => user.id === id && !user.deleted_at && user.status === 1)
}
export function getMockIdentity(headers?: HeadersInit) {
  const user = getMockUser(headers)
  return user ? getUserInfo(user) : undefined
}

export function revokeMockToken(headers?: HeadersInit): void {
  const token = new Headers(headers).get('authorization')?.replace(/^Bearer /, '') ?? ''
  tokens.delete(token)
}
