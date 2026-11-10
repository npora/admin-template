import type { MockAdapter } from '@npora/request/testing'
import type { DefaultApiResponse } from '@/api/types/common'
import type { LoginRequest, LoginResult } from '@/api/types/auth'
import { db } from '../rbac/database'
import { verifyMockPassword } from '../rbac/password'
import { getMockIdentity, issueMockToken, revokeMockToken } from '../identity'
import { mockSuccess, mockFailure } from '../utils'

export function setupAuthMock(adapter: MockAdapter): void {
  adapter.onPost('/auth/logout').reply((config) => {
    revokeMockToken(config.headers)
    return mockSuccess(null)
  })
  adapter.onPost('/auth/login').reply<DefaultApiResponse<LoginResult>>(async (config) => {
    const input = config.json as LoginRequest | undefined
    if (typeof input?.username !== 'string' || typeof input?.password !== 'string')
      return mockFailure('用户名或密码错误')
    const user = db.users.find(
      (item) =>
        !item.deleted_at &&
        item.status === 1 &&
        item.username.toLowerCase() === input.username!.toLowerCase()
    )
    if (!user) return mockFailure('用户名或密码错误')
    const hash = user.password_hash
    if (!(await verifyMockPassword(input.password, hash))) return mockFailure('用户名或密码错误')
    if (user.deleted_at || user.status !== 1) return mockFailure('用户名或密码错误')
    user.password_hash = hash
    user.last_login_at = user.updated_at = new Date().toISOString()
    return mockSuccess({ accessToken: issueMockToken(user.id) })
  })
  adapter.onGet('/auth/user').reply((config) => {
    const user = getMockIdentity(config.headers)
    return user ? mockSuccess(user) : mockFailure('登录状态已失效', 10002)
  })
}
