export interface ApiErrorOptions<T = unknown> {
  code: string | number
  message: string
  data?: T
}

export class ApiError<T = unknown> extends Error {
  readonly code: string | number

  readonly data?: T

  constructor(options: ApiErrorOptions<T>) {
    super(options.message)

    this.name = 'ApiError'
    this.code = options.code
    this.data = options.data
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
