import { onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { getAuditLogs } from '@/api/modules/audit-log'
import type { AuditLogEntry, AuditLogListQuery } from '@/api/types/audit-log'
import { usePermission } from '@/composables/usePermission'

export function useAuditLogTable() {
  const { hasPermission } = usePermission()
  const canList = () => hasPermission('system:audit-log:list')
  const filters = reactive<Pick<AuditLogListQuery, 'action' | 'result'>>({})
  const query = reactive<AuditLogListQuery>({ page: 1, pageSize: 10 })
  const rows = shallowRef<AuditLogEntry[]>([])
  const total = ref(0)
  const loading = ref(false)
  const loadFailed = ref(false)
  let controller: AbortController | undefined

  watch(
    canList,
    (allowed) => {
      if (allowed) {
        void load()
      } else {
        controller?.abort()
        rows.value = []
        total.value = 0
        loading.value = false
        loadFailed.value = false
      }
    },
    { immediate: true, flush: 'sync' }
  )

  onScopeDispose(() => controller?.abort())

  async function load(): Promise<void> {
    if (!canList()) return
    controller?.abort()
    const current = new AbortController()
    controller = current
    const tokenVersion = getTokenVersion()
    const isCurrent = () => !current.signal.aborted && tokenVersion === getTokenVersion()
    loading.value = true
    loadFailed.value = false
    try {
      const result = await getAuditLogs({ ...query }, current.signal)
      if (!isCurrent()) return
      const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize))
      if (query.page > lastPage) {
        await changePage(lastPage)
        return
      }
      rows.value = result.list
      total.value = result.total
    } catch (error) {
      if (!isCurrent()) return
      rows.value = []
      total.value = 0
      loadFailed.value = true
      handleRequestError(error)
    } finally {
      if (controller === current && !current.signal.aborted) loading.value = false
    }
  }

  function search() {
    query.action = filters.action || undefined
    query.result = filters.result || undefined
    return changePage(1)
  }

  function reset() {
    filters.action = undefined
    filters.result = undefined
    return search()
  }

  function changePage(page: number) {
    query.page = page
    return load()
  }

  function changePageSize(pageSize: number) {
    query.pageSize = pageSize
    return changePage(1)
  }

  return {
    canList,
    filters,
    query,
    rows,
    total,
    loading,
    loadFailed,
    load,
    search,
    reset,
    changePage,
    changePageSize
  }
}
