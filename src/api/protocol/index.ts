import { ApiError } from '../errors/ApiError'

/** 默认 JSON 协议适配入口；接入其他后端时在此统一调整。 */
export function unwrapApiResponse(response: unknown): unknown {
  if (
    !response ||
    typeof response !== 'object' ||
    !('code' in response) ||
    !(
      (typeof response.code === 'number' && Number.isFinite(response.code)) ||
      (typeof response.code === 'string' && response.code.trim())
    ) ||
    !('message' in response) ||
    typeof response.message !== 'string' ||
    !('data' in response)
  ) {
    throw new ApiError({
      code: 'API_RESPONSE_INVALID',
      message: '服务器返回的数据格式异常'
    })
  }

  if (response.code !== 0) {
    throw new ApiError({ code: response.code, message: response.message, data: response.data })
  }

  return response.data
}
