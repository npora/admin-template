import type { Plugin } from '@npora/request/core'

import { getTokenVersion, tokenStorage } from '../auth/token-storage'
import { handleRequestError, type RequestFailureContext } from '../errors/handling'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse } from '../types/common'

/** 检查业务协议，并仅在重试结束后处理最终错误。 */
export function requestErrorsPlugin(authenticated: boolean): Plugin {
  return {
    name: 'app-request-errors',
    install({ hooks }) {
      const snapshots = new WeakMap<object, RequestFailureContext>()
      hooks.onRequest((context) => {
        if (!snapshots.has(context)) {
          snapshots.set(context, {
            authenticated,
            tokenVersion: getTokenVersion(),
            token: tokenStorage.get(),
            silent: context.config.context?.silentError === true
          })
        }
      })
      hooks.onResponse(
        (context) => {
          const body = context.response?.data
          if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
            unwrapApiResponse(body as DefaultApiResponse<unknown>)
          }
        },
        { requiresRawResponse: false }
      )
      hooks.onSettled((context) => {
        if (context.error) handleRequestError(context.error, snapshots.get(context))
      })
    }
  }
}
