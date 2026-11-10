import { MockAdapter } from '@npora/request/testing'

import { setupAuthMock } from './modules/auth'
import { setupRouteMock } from './modules/route'
import { setupRoleMock } from './modules/role'
import { setupMenuMock } from './modules/menu'
import { setupDashboardMock } from './modules/dashboard'
import { setupDepartmentMock } from './modules/department'
import { setupUserMock } from './modules/user'

export const mockAdapter = new MockAdapter()
setupAuthMock(mockAdapter)
setupRouteMock(mockAdapter)
setupUserMock(mockAdapter)

setupRoleMock(mockAdapter)
setupMenuMock(mockAdapter)

setupDepartmentMock(mockAdapter)

setupDashboardMock(mockAdapter)
