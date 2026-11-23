// 固定种子中的页面可在授权路由缺失时识别，其他地址仍显示 404。
const builtInSystemPages = new Set([
  '/system/user',
  '/system/department',
  '/system/role',
  '/system/menu',
  '/system/dict',
  '/system/audit-log'
])

export function isBuiltInSystemPage(path: string): boolean {
  // 与 Vue Router 默认的不区分大小写、允许末尾斜线的匹配规则一致。
  return builtInSystemPages.has(path.toLowerCase().replace(/\/$/, ''))
}
