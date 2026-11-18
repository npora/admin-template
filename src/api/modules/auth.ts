import { publicRequest, request } from '../client'
import { isNotFoundError } from '../errors/handling'
import { getDynamicRoutes } from './route'
import type { DynamicRoute } from '../types/route'

import type {
  LoginRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
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

export async function getSessionInfo(): Promise<{ user: UserInfoResult; routes: DynamicRoute[] }> {
  try {
    return await request.get<{ user: UserInfoResult; routes: DynamicRoute[] }>('/auth/session', {
      context: { fallbackOnNotFound: true }
    })
  } catch (error) {
    if (!isNotFoundError(error)) throw error
    const [user, routes] = await Promise.all([getUserInfo(), getDynamicRoutes()])
    return { user, routes }
  }
}

export function resetPassword(json: ResetPasswordRequest, signal?: AbortSignal) {
  return publicRequest.post<null>('/auth/password/reset', {
    json,
    signal,
    context: { silentError: true }
  })
}

export function changePassword(json: ChangePasswordRequest, signal?: AbortSignal) {
  return request.post<null>('/auth/password/change', { json, signal })
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
