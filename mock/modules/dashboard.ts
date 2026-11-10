import type { MockAdapter } from '@npora/request/testing'
import type { DashboardOverview } from '@/api/types/dashboard'
import { db } from '../rbac/database'
import { dynamicRoutes, getUserInfo, toUserDto, userRoles } from '../rbac/access'
import { getMockUser } from '../identity'
import { mockSuccess, mockFailure } from '../utils'

export function setupDashboardMock(adapter: MockAdapter): void {
  adapter.onGet('/system/dashboard').reply((config) => {
    const user = getMockUser(config.headers)
    if (!user) return mockFailure('登录状态已失效', 10002)
    const identity = getUserInfo(user)
    const can = (permission: string) =>
      identity.permissions.includes('*') || identity.permissions.includes(permission)
    const capabilities = {
      users: can('system:user:list'),
      roles: can('system:role:list'),
      departments: can('system:department:list'),
      menus: can('system:menu:list')
    }
    const countPages = (routes: ReturnType<typeof dynamicRoutes>): number =>
      routes.reduce(
        (count, route) => count + (route.component ? 1 : 0) + countPages(route.children ?? []),
        0
      )
    const result: DashboardOverview = {
      generatedAt: new Date().toISOString(),
      capabilities,
      account: {
        roleNames: userRoles(user.id)
          .filter((role) => role.status === 1)
          .map((role) => role.name),
        departmentName:
          db.departments.find((item) => item.id === user.department_id && !item.deleted_at)?.name ??
          null,
        isSuperAdmin: Boolean(user.is_super_admin)
      },
      accessiblePages: 1 + countPages(dynamicRoutes(user))
    }
    if (capabilities.users) {
      const users = db.users.filter((item) => !item.deleted_at)
      const distribution = new Map<
        number | null,
        { id: number | null; name: string; count: number }
      >()
      for (const item of users) {
        const department = db.departments.find(
          (node) => node.id === item.department_id && !node.deleted_at
        )
        const id = department?.id ?? null
        const group = distribution.get(id) ?? {
          id,
          name: department?.name ?? '未分配部门',
          count: 0
        }
        group.count++
        distribution.set(id, group)
      }
      result.users = {
        total: users.length,
        enabled: users.filter((item) => item.status === 1).length,
        disabled: users.filter((item) => item.status === 0).length,
        recent: [...users]
          .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
          .slice(0, 5)
          .map(toUserDto),
        departments: [...distribution.values()].sort((a, b) => b.count - a.count)
      }
    }
    if (capabilities.roles) {
      const roles = db.roles.filter((item) => !item.deleted_at)
      result.roles = {
        total: roles.length,
        enabled: roles.filter((item) => item.status === 1).length
      }
    }
    if (capabilities.departments) {
      const departments = db.departments.filter((item) => !item.deleted_at)
      result.departments = {
        total: departments.length,
        enabled: departments.filter((item) => item.status === 1).length
      }
    }
    return mockSuccess(result)
  })
}
