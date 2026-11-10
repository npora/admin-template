import { request } from '../client'

import type { DynamicRoute } from '../types/route'

export async function getDynamicRoutes(): Promise<DynamicRoute[]> {
  return request.get<DynamicRoute[]>('/auth/routes')
}
