import { onScopeDispose, ref } from 'vue'
import { getDashboardOverview } from '@/api/modules/dashboard'
import type { DashboardOverview } from '@/api/types/dashboard'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'

export function useDashboard() {
  const overview = ref<DashboardOverview>(),
    loading = ref(false),
    failed = ref(false)
  let version = 0,
    disposed = false,
    controller: AbortController | undefined
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  async function load(): Promise<void> {
    const current = ++version,
      token = getTokenVersion()
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    failed.value = false
    try {
      const result = await getDashboardOverview(controller.signal)
      if (!disposed && current === version && token === getTokenVersion()) overview.value = result
    } catch (error) {
      if (!disposed && current === version && token === getTokenVersion()) {
        failed.value = true
        handleRequestError(error)
      }
    } finally {
      if (!disposed && current === version) loading.value = false
    }
  }
  return { overview, loading, failed, load }
}
