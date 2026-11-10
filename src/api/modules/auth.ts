import { publicRequest, request } from '../client'
import { unwrapApiResponse } from '../protocol/default'

import type { LoginRequest, LoginResult, UserInfoResult } from '../types/auth'
import type { DefaultApiResponse } from '../types/common'

export async function login(data: LoginRequest): Promise<LoginResult> {
  const response = await publicRequest.post<DefaultApiResponse<LoginResult>>('/auth/login', {
    json: data
  })

  return unwrapApiResponse(response)
}

export async function getUserInfo(): Promise<UserInfoResult> {
  const response = await request.get<DefaultApiResponse<UserInfoResult>>('/auth/user')

  return unwrapApiResponse(response)
}

/** 撤销指定旧 Token，使用公共客户端避免影响后续新会话。 */
export async function revokeSession(token: string): Promise<void> {
  const response = await publicRequest.post<DefaultApiResponse<null>>('/auth/logout', {
    headers: { Authorization: `Bearer ${token}` },
    context: { silentError: true },
    timeout: 5000,
    totalTimeout: 5000
  })
  unwrapApiResponse(response)
}
