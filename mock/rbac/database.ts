import type { DepartmentRow, MenuRow, RoleMenuRow, RoleRow, UserRoleRow, UserRow } from './types'
const fixturePasswordHash =
  'pbkdf2$600000$59d30709149391288698ca4d8500f199$1c0b707e65dc4e5a744e3a254c9bbc7add778620a533e0d2f45bd3c808d399b1'

export const audit = () => ({
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null
})
export const db: {
  users: UserRow[]
  departments: DepartmentRow[]
  roles: RoleRow[]
  menus: MenuRow[]
  userRoles: UserRoleRow[]
  roleMenus: RoleMenuRow[]
} = { users: [], departments: [], roles: [], menus: [], userRoles: [], roleMenus: [] }
export function resetMockDatabase(): void {
  db.departments = [
    {
      id: 1,
      parent_id: null,
      name: '总部',
      code: 'headquarters',
      leader: null,
      phone: null,
      email: null,
      sort_order: 0,
      status: 1,
      ...audit()
    },
    {
      id: 2,
      parent_id: 1,
      name: '产品研发部',
      code: 'development',
      leader: null,
      phone: null,
      email: null,
      sort_order: 10,
      status: 1,
      ...audit()
    },
    {
      id: 3,
      parent_id: 1,
      name: '运营部',
      code: 'operations',
      leader: null,
      phone: null,
      email: null,
      sort_order: 20,
      status: 1,
      ...audit()
    }
  ]
  db.roles = [
    {
      id: 1,
      code: 'admin',
      name: '系统管理员',
      description: '常规管理权限；超级管理员标记独立于角色',
      sort_order: 0,
      status: 1,
      ...audit()
    },
    {
      id: 2,
      code: 'editor',
      name: '用户编辑者',
      description: '查询、新增和编辑用户，不包含角色分配',
      sort_order: 10,
      status: 1,
      ...audit()
    },
    {
      id: 3,
      code: 'viewer',
      name: '只读用户',
      description: '只允许查看用户列表',
      sort_order: 20,
      status: 1,
      ...audit()
    }
  ]
  db.users = Array.from({ length: 26 }, (_, index) => ({
    id: index + 1,
    department_id: index % 2 ? 3 : 2,
    username:
      index === 0 ? 'admin' : index === 1 ? 'viewer' : `user${String(index + 1).padStart(3, '0')}`,
    password_hash: fixturePasswordHash,
    display_name: index === 0 ? '系统管理员' : index === 1 ? '只读用户' : `示例用户${index + 1}`,
    avatar: null,
    email:
      index === 0
        ? 'admin@example.com'
        : index === 1
          ? 'viewer@example.com'
          : `user${index + 1}@example.com`,
    mobile: null,
    status: index !== 0 && index % 5 === 0 ? 0 : 1,
    is_super_admin: index === 0 ? 1 : 0,
    last_login_at: null,
    ...audit()
  }))
  db.userRoles = db.users.map((user) => ({
    user_id: user.id,
    role_id: user.is_super_admin ? 1 : user.id % 3 === 0 ? 2 : 3,
    created_at: new Date().toISOString()
  }))
  const menu = (
    id: number,
    parent_id: number | null,
    type: 1 | 2 | 3,
    title: string,
    extra: Partial<MenuRow> = {}
  ): MenuRow => ({
    id,
    parent_id,
    type,
    title,
    name: null,
    path: null,
    component: null,
    redirect: null,
    route_query: null,
    active_menu: null,
    icon: null,
    permission: null,
    visible: 1,
    always_show: 0,
    keep_alive: 0,
    fixed_tab: 0,
    sort_order: id,
    status: 1,
    ...audit(),
    ...extra
  })
  db.menus = [
    menu(1, null, 1, '系统管理', { path: '/system', icon: 'setting', always_show: 1 }),
    menu(10, 1, 2, '用户管理', {
      path: 'user',
      name: 'SystemUser',
      component: 'system/user/index',
      icon: 'user',
      keep_alive: 1
    }),
    ...['list', 'create', 'update', 'delete', 'assign-roles'].map((action, index) =>
      menu(11 + index, 10, 3, ['查看', '新增', '编辑', '删除', '分配角色'][index]!, {
        permission: `system:user:${action}`
      })
    ),
    menu(20, 1, 2, '角色管理', {
      path: 'role',
      name: 'SystemRole',
      component: 'system/role/index',
      icon: 'lock',
      keep_alive: 1
    }),
    ...['list', 'create', 'update', 'delete', 'grant'].map((action, index) =>
      menu(21 + index, 20, 3, ['查看', '新增', '编辑', '删除', '授权'][index]!, {
        permission: `system:role:${action}`
      })
    ),
    menu(30, 1, 2, '菜单管理', {
      path: 'menu',
      name: 'SystemMenu',
      component: 'system/menu/index',
      icon: 'setting',
      keep_alive: 1
    }),
    ...['list', 'create', 'update', 'delete'].map((action, index) =>
      menu(31 + index, 30, 3, ['查看', '新增', '编辑', '删除'][index]!, {
        permission: `system:menu:${action}`
      })
    ),
    menu(50, 1, 2, '部门管理', {
      path: 'department',
      name: 'SystemDepartment',
      component: 'system/department/index',
      icon: 'office-building',
      keep_alive: 1,
      sort_order: 15
    }),
    ...['list', 'create', 'update', 'delete'].map((action, index) =>
      menu(51 + index, 50, 3, ['查看', '新增', '编辑', '删除'][index]!, {
        permission: `system:department:${action}`
      })
    ),
    menu(40, 1, 1, '操作示例', { path: 'operation', always_show: 1 }),
    menu(41, 40, 2, '下载示例', {
      path: 'download',
      name: 'SystemDownload',
      component: 'examples/download/index',
      keep_alive: 1
    }),
    menu(42, 41, 3, '下载', { permission: 'system:download:download' }),
    menu(43, 40, 2, '表格示例', {
      path: 'table',
      name: 'SystemTable',
      component: 'examples/table/index'
    }),
    menu(44, 43, 3, '查看', { permission: 'system:table:list' })
  ]
  db.roleMenus = [
    ...db.menus.map((node) => ({
      role_id: 1,
      menu_id: node.id,
      created_at: new Date().toISOString()
    })),
    ...[1, 10, 11, 12, 13].map((menu_id) => ({
      role_id: 2,
      menu_id,
      created_at: new Date().toISOString()
    })),
    ...[1, 10, 11].map((menu_id) => ({ role_id: 3, menu_id, created_at: new Date().toISOString() }))
  ]
}
resetMockDatabase()
