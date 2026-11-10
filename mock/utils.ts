import type { RequestConfig } from '@npora/request/core'
import type { MockReply } from '@npora/request/testing'
import type { DefaultApiResponse } from '@/api/types/common'
import { getMockIdentity } from './identity'

export function mockSuccess<T>(data: T): MockReply<DefaultApiResponse<T>> {
  return { status: 200, data: { code: 0, message: 'success', data: structuredClone(data) } }
}

export function mockFailure(
  message: string,
  code = 10001,
  status = 200
): MockReply<DefaultApiResponse<never>> {
  return { status, data: { code, message, data: null } }
}

export function requireMockPermission(config: RequestConfig, permission: string) {
  const user = getMockIdentity(config.headers)
  if (!user) return mockFailure('登录状态已失效', 10002)
  if (!user.permissions.includes('*') && !user.permissions.includes(permission)) {
    return mockFailure('没有执行此操作的权限', 10003, 403)
  }
}

export function requireAnyMockPermission(config: RequestConfig, permissions: string[]) {
  const user = getMockIdentity(config.headers)
  if (!user) return mockFailure('登录状态已失效', 10002)
  if (
    !user.permissions.includes('*') &&
    !permissions.some((permission) => user.permissions.includes(permission))
  ) {
    return mockFailure('没有执行此操作的权限', 10003, 403)
  }
}
