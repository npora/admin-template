import { request } from '../client'
import type { DashboardOverview } from '../types/dashboard'

export async function getDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
  return request.get<DashboardOverview>('/system/dashboard', { signal })
}
