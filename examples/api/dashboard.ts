import { request } from '@/api/client'
import type { DashboardOverview } from './types'

export async function getDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
  return request.get<DashboardOverview>('/system/dashboard', { signal })
}
