/** Vite 代理与浏览器请求必须使用同一个站内 API 前缀。 */
export function normalizeApiPrefix(value?: string): string {
  const prefix = (value?.trim() || '/api').replace(/\/+$/, '')
  if (!prefix.startsWith('/') || prefix.startsWith('//') || /[\\\s?#]/.test(prefix)) {
    throw new Error('VITE_API_PREFIX 必须是非根路径的站内前缀，例如 /api')
  }
  return prefix
}
