export interface RoutePermission {
  /** 授权页面中展示的按钮名称。 */
  name: string
  /** 权限码，例如 system:user:create；描述权限，不代表授予当前用户。 */
  permission: string
}

export type RouteQueryValue = string | number | boolean
export type RouteQuery = Record<string, RouteQueryValue>

/** 后端路由契约：顶层用绝对路径，子级用相对路径。 */
export interface DynamicRoute {
  path: string
  /** 页面节点必填，且全局唯一。 */
  name?: string
  title: string
  /** 相对 src/views 的页面入口，例如 system/user/index，不含 .vue。 */
  component?: string
  /** 图标注册表中的名称。 */
  icon?: string
  redirect?: string
  routeQuery?: RouteQuery
  /** 仅隐藏菜单与标签，不限制路由访问。 */
  hidden?: boolean
  /** 单个可见子菜单时仍保留父目录。 */
  alwaysShow?: boolean
  /** 隐藏详情页需要高亮的菜单路径。 */
  activeMenu?: string
  keepAlive?: boolean
  fixedTab?: boolean
  /** 越小越靠前，未设置的项排最后。 */
  order?: number
  children?: DynamicRoute[]
  permissions?: RoutePermission[]
}
