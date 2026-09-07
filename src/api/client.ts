import { createClient } from '@npora/request/core'
import { authPlugin } from '@npora/request/plugins/auth'
import { retryPlugin } from '@npora/request/plugins/retry'

import { tokenStorage } from './auth/token-storage'

const clientOptions = {
  baseURL: import.meta.env.VITE_API_PREFIX,
  allowAbsoluteUrls: false,

  timeout: 10_000,
  totalTimeout: 30_000,

  fetchOptions: {
    credentials: 'same-origin'
  }
} as const

export const publicRequest =
  createClient(clientOptions)

export const request = publicRequest
  .extend()
  .use(
    authPlugin({
      storage: tokenStorage
    })
  )
  .use(
    retryPlugin({
      retries: 2,
      retryOnTimeout: false,
      respectRetryAfter: true,
      jitter: true,
      maxElapsedTime: 15_000
    })
  )

export default request