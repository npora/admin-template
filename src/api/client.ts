import { createClient } from '@npora/request/core'
import { authPlugin } from '@npora/request/plugins/auth'
import { retryPlugin } from '@npora/request/plugins/retry'

import { appConfig } from '@/config/app'
import { tokenStorage } from './auth/token-storage'
import { isApiError } from './errors/ApiError'
import { requestErrorsPlugin } from './plugins/errors'

const clientOptions = {
  baseURL: appConfig.apiPrefix,
  allowAbsoluteUrls: false,
  timeout: 10_000,
  totalTimeout: 30_000,
  fetchOptions: { credentials: 'same-origin' }
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
