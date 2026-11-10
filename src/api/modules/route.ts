import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'

import type { DynamicRoute } from '../types/route'
import type { DefaultApiResponse } from '../types/common'

export async function getDynamicRoutes(): Promise<DynamicRoute[]> {
  const response = await request.get<DefaultApiResponse<DynamicRoute[]>>('/auth/routes')

  return unwrapApiResponse(response)
}
