import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse } from '../types/common'
import type { DashboardOverview } from '../types/dashboard'

export async function getDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<DashboardOverview>>('/system/dashboard', { signal })
  )
}
