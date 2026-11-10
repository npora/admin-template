import { createClient, type Adapter } from '@npora/request/core'
import { authPlugin } from '@npora/request/plugins/auth'
import { retryPlugin } from '@npora/request/plugins/retry'

import { appConfig } from '@/config/app'
import { tokenStorage } from './auth/token-storage'
import { isApiError } from './errors/ApiError'
import { requestErrorsPlugin } from './plugins/errors'

// Mock 代码只在开发环境首次请求时加载，不进入生产构建。
const adapter: Adapter | undefined =
  import.meta.env.DEV && appConfig.mockEnabled
    ? {
        async request(config) {
          const { mockAdapter } = await import('virtual:admin-mock')
          return mockAdapter.request(config)
        }
      }
    : undefined

const clientOptions = {
  baseURL: appConfig.apiPrefix,
  allowAbsoluteUrls: false,
  timeout: 10_000,
  totalTimeout: 30_000,
  fetchOptions: { credentials: 'same-origin' },
  ...(adapter ? { adapter } : {})
} as const

export const publicRequest = createClient(clientOptions).use(requestErrorsPlugin(false))

export const request = publicRequest
  .extend()
  .use(authPlugin({ storage: tokenStorage }))
  .use(
    retryPlugin({
      retries: 2,
      shouldRetry: (error) => (isApiError(error) ? false : undefined),
      retryOnTimeout: false,
      respectRetryAfter: true,
      jitter: true,
      maxElapsedTime: 15_000
    })
  )
  .use(requestErrorsPlugin(true))

export default request
