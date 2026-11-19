import { request } from '../client'
import type { SessionEntry, SessionRevocationResult } from '../types/session'

export function getOwnSessions(signal?: AbortSignal) {
  return request.get<SessionEntry[]>('/auth/sessions', {
    signal,
    context: { fallbackOnNotFound: true }
  })
}

export function revokeOwnSession(id: string, signal?: AbortSignal) {
  return request.delete<SessionRevocationResult>(`/auth/sessions/${encodeURIComponent(id)}`, {
    signal
  })
}

export function revokeOtherSessions(signal?: AbortSignal) {
  return request.delete<SessionRevocationResult>('/auth/sessions/others', { signal })
}

export function getUserSessions(userId: number, signal?: AbortSignal) {
  return request.get<SessionEntry[]>(`/system/users/${userId}/sessions`, { signal })
}

export function revokeUserSession(userId: number, id: string, signal?: AbortSignal) {
  return request.delete<SessionRevocationResult>(
    `/system/users/${userId}/sessions/${encodeURIComponent(id)}`,
    { signal }
  )
}
