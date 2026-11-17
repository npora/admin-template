import { publicRequest, request } from '../client'

import type {
  LoginRequest,
  LoginResult,
  UserInfoResult,
  AuthenticatorStatus,
  AuthenticatorSetup
} from '../types/auth'

export async function login(data: LoginRequest): Promise<LoginResult> {
  return publicRequest.post<LoginResult>('/auth/login', {
    json: data
  })
}

export async function getUserInfo(): Promise<UserInfoResult> {
  return request.get<UserInfoResult>('/auth/user')
}

export function getAuthenticatorStatus(signal?: AbortSignal) {
  return request.get<AuthenticatorStatus>('/auth/totp', { signal })
}
export function setupAuthenticator(password: string, signal?: AbortSignal) {
  return request.post<AuthenticatorSetup>('/auth/totp/setup', { json: { password }, signal })
}
export function enableAuthenticator(password: string, code: string, signal?: AbortSignal) {
  return request.post<null>('/auth/totp/enable', { json: { password, code }, signal })
}
export function disableAuthenticator(password: string, code: string, signal?: AbortSignal) {
  return request.post<null>('/auth/totp/disable', { json: { password, code }, signal })
}

/** 撤销指定旧 Token，使用公共客户端避免影响后续新会话。 */
export async function revokeSession(token: string): Promise<void> {
  await publicRequest.post<null>('/auth/logout', {
    headers: { Authorization: `Bearer ${token}` },
    context: { silentError: true },
    timeout: 5000,
    totalTimeout: 5000
  })
}
