import type { MockAdapter } from '@npora/request/testing'
import type { DynamicRoute } from '@/api/types/route'
import type { DefaultApiResponse } from '@/api/types/common'
import { getMockUser } from '../identity'
import { dynamicRoutes } from '../rbac/access'
import { mockSuccess, mockFailure } from '../utils'

export function setupRouteMock(adapter: MockAdapter): void {
  adapter.onGet('/auth/routes').reply<DefaultApiResponse<DynamicRoute[]>>((config) => {
    const user = getMockUser(config.headers)
    return user ? mockSuccess(dynamicRoutes(user)) : mockFailure('登录状态已失效', 10002)
  })
}
