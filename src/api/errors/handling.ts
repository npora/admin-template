import { isRequestError } from '@npora/request/core'
import { isApiError } from './ApiError'

export interface RequestFailureContext {
  authenticated: boolean
  tokenVersion: number
  token: string | null
  silent: boolean
}

type ErrorHandler = (error: unknown, context?: RequestFailureContext) => void
let handler: ErrorHandler | undefined
const handledErrors = new WeakSet<object>()

/** UI 在启动时注入，请求层不依赖 Router、Pinia 或 Element Plus。 */
export function setRequestErrorHandler(value: ErrorHandler): () => void {
  handler = value
  return () => {
    if (handler === value) handler = undefined
  }
}

export function handleRequestError(error: unknown, context?: RequestFailureContext): void {
  if (error !== null && typeof error === 'object') {
    if (handledErrors.has(error)) return
    handledErrors.add(error)
  }
  handler?.(error, context)
}

export function isUnauthorizedError(error: unknown): boolean {
  if (isRequestError(error)) return error.code === 'HTTP_ERROR' && error.status === 401
  // 默认后端协议的登录失效码；其他后端可在这里调整。
  return isApiError(error) && [401, '401', 10002, '10002'].includes(error.code)
}

export function isCancelledRequest(error: unknown): boolean {
  return isRequestError(error) && error.code === 'ABORT_ERROR'
}

export function getRequestErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message || '操作失败，请稍后重试'
  if (isRequestError(error)) {
    if (error.code === 'TIMEOUT_ERROR') return '请求超时，请稍后重试'
    if (error.code === 'NETWORK_ERROR') return '网络连接失败，请检查网络'
    if (error.code === 'PARSER_ERROR' || error.code === 'SCHEMA_ERROR')
      return '服务器返回的数据格式异常'
    // 展示后端规范响应中的校验/冲突消息，不把 HTML 或未知响应当作用户提示。
    if (error.status && [400, 409, 422].includes(error.status)) {
      const body = error.data
      if (
        body &&
        typeof body === 'object' &&
        'code' in body &&
        'message' in body &&
        typeof body.message === 'string' &&
        body.message.trim() &&
        body.message.length <= 300
      )
        return body.message
    }
    if (error.status === 401) return '身份验证失败，请检查登录信息'
    if (error.status === 403) return '没有执行此操作的权限'
    if (error.status === 404) return '请求的接口不存在'
    if (error.status === 429) return '请求过于频繁，请稍后重试'
    if (error.status && error.status >= 500) return '服务器暂时不可用，请稍后重试'
  }
  return '操作失败，请稍后重试'
}
