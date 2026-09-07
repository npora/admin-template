import type { DefaultApiResponse } from '../types/common'

import {
  createApiUnwrap,
  type ApiProtocol
} from './index'

const defaultApiProtocol: ApiProtocol<
  DefaultApiResponse<unknown>,
  unknown
> = {
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

export function unwrapApiResponse<T>(
  response: DefaultApiResponse<T>
): T {
  return unwrap(response) as T
}