import { ApiError } from '../errors/ApiError'

export interface ApiProtocol<TResponse, TData> {
  isSuccess(response: TResponse): boolean

  getData(response: TResponse): TData

  getCode(response: TResponse): string | number

  getMessage(response: TResponse): string
}

export function createApiUnwrap<TResponse, TData>(protocol: ApiProtocol<TResponse, TData>) {
  return (response: TResponse): TData => {
    if (!protocol.isSuccess(response)) {
      throw new ApiError<TData>({
        code: protocol.getCode(response),
        message: protocol.getMessage(response),
        data: protocol.getData(response)
      })
    }

    return protocol.getData(response)
  }
}
