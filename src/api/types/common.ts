export interface DefaultApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
}
