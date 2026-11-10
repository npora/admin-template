/** 内存表严格使用 schema.sql 列名，DTO 转换在独立映射层完成。 */
export interface AuditRow {
  created_at: string
  updated_at: string
  deleted_at: string | null
}
export interface UserRow extends AuditRow {
  id: number
  department_id: number | null
  username: string
  password_hash: string
  display_name: string
  avatar: string | null
  email: string | null
  mobile: string | null
  status: 0 | 1
  is_super_admin: 0 | 1
  last_login_at: string | null
}
export interface RoleRow extends AuditRow {
  id: number
  code: string
  name: string
  description: string | null
  sort_order: number
  status: 0 | 1
}
export interface MenuRow extends AuditRow {
  id: number
  parent_id: number | null
  type: 1 | 2 | 3
  title: string
  name: string | null
  path: string | null
  component: string | null
  redirect: string | null
  route_query: Record<string, string | number | boolean> | null
  active_menu: string | null
  icon: string | null
  permission: string | null
  visible: 0 | 1
  always_show: 0 | 1
  keep_alive: 0 | 1
  fixed_tab: 0 | 1
  sort_order: number
  status: 0 | 1
}
export interface DepartmentRow extends AuditRow {
  id: number
  parent_id: number | null
  name: string
  code: string | null
  leader: string | null
  phone: string | null
  email: string | null
  sort_order: number
  status: 0 | 1
}
export interface UserRoleRow {
  user_id: number
  role_id: number
  created_at: string
}
export interface RoleMenuRow {
  role_id: number
  menu_id: number
  created_at: string
}
