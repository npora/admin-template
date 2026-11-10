import { publicRequest, request } from '../client'

import type { LoginRequest, LoginResult, UserInfoResult } from '../types/auth'

export async function login(data: LoginRequest): Promise<LoginResult> {
  return publicRequest.post<LoginResult>('/auth/login', {
    json: data
  })
}

export async function getUserInfo(): Promise<UserInfoResult> {
  return request.get<UserInfoResult>('/auth/user')
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
