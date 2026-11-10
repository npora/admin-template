import type { DefaultApiResponse } from '../types/common'
import { ApiError } from '../errors/ApiError'

import { createApiUnwrap, type ApiProtocol } from './index'

const defaultApiProtocol: ApiProtocol<DefaultApiResponse<unknown>, unknown> = {
  isSuccess(response: DefaultApiResponse<unknown>) {
    return response.code === 0
  },

  getData(response: DefaultApiResponse<unknown>) {
    return response.data
  },

  getCode(response: DefaultApiResponse<unknown>) {
    return response.code
  },

  getMessage(response: DefaultApiResponse<unknown>) {
    return response.message
  }
}

const unwrap = createApiUnwrap(defaultApiProtocol)

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

  return unwrap(response as DefaultApiResponse)
}
