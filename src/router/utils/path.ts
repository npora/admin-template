/** 拼接路由路径，同时统一尾部斜线，供菜单和冲突校验共同使用。 */
export function joinRoutePath(parent: string, path: string): string {
  const fullPath = path.startsWith('/') ? path : `${parent.replace(/\/$/, '')}/${path}`
  return fullPath.replace(/\/$/, '') || '/'
}

export function compareRouteOrder(a: { order?: number }, b: { order?: number }): number {
  return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
}

/** 登录后只回到站内地址，并避免再次跳入登录页。 */
export function getLoginRedirect(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return '/'
  try {
    const path = decodeURIComponent(value.split(/[?#]/)[0]!).replace(/\/+$/, '').toLowerCase()
    if (path === '/login' || path.startsWith('//') || path.includes('\\')) return '/'
  } catch {
    return '/'
  }
  return value
}
