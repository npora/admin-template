import type { RouteQuery } from './route'
import type { AuditFields, SystemStatus } from './system'

/** sys_menu.type：1=目录，2=页面，3=按钮权限。 */
export type MenuType = 1 | 2 | 3
export interface MenuInput {
  parentId: number | null
  type: MenuType
  title: string
  name: string | null
  path: string | null
  component: string | null
  redirect: string | null
  routeQuery: RouteQuery | null
  activeMenu: string | null
  icon: string | null
  permission: string | null
  visible: boolean
  alwaysShow: boolean
  keepAlive: boolean
  fixedTab: boolean
  sortOrder: number
  status: SystemStatus
}
export interface ManagedMenu extends MenuInput, AuditFields {
  id: number
  children?: ManagedMenu[]
}
