import { onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { getAuditLogs } from '@/api/modules/audit-log'
import type { AuditLogEntry, AuditLogListQuery } from '@/api/types/audit-log'
import { usePermission } from '@/composables/usePermission'
import type { TimestampRange } from '@/types/timezone'

type AuditLogFilters = Pick<AuditLogListQuery, 'action' | 'result'> & {
  actorId: string
  targetId: string
  timeRange: TimestampRange | null
}

function parseId(value: string): number | null | undefined {
  const input = value.trim()
  if (!input) return undefined
  const id = Number(input)
  return /^\d+$/.test(input) && Number.isSafeInteger(id) && id > 0 ? id : null
}

export function useAuditLogTable() {
  const { hasPermission } = usePermission()
  const canList = () => hasPermission('system:audit-log:list')
  const filters = reactive<AuditLogFilters>({ actorId: '', targetId: '', timeRange: null })
  const filterErrors = reactive({ actorId: false, targetId: false, timeRange: false })
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

  function updateTimeRange(value: TimestampRange | null) {
    filters.timeRange = value
    filterErrors.timeRange = false
  }

  function rejectTimeRange() {
    filterErrors.timeRange = true
  }

  function search() {
    const actorId = parseId(filters.actorId)
    const targetId = parseId(filters.targetId)
    const range = filters.timeRange
    if (range && (!range.every(Number.isSafeInteger) || range[0] < 0 || range[0] >= range[1])) {
      rejectTimeRange()
    }
    filterErrors.actorId = actorId === null
    filterErrors.targetId = targetId === null
    if (actorId === null || targetId === null || filterErrors.timeRange) return

    Object.assign(query, {
      action: filters.action || undefined,
      result: filters.result || undefined,
      actorId,
      targetId,
      createdFrom: range?.[0],
      createdTo: range?.[1]
    })
    return changePage(1)
  }

  function reset() {
    filters.action = undefined
    filters.result = undefined
    filters.actorId = ''
    filters.targetId = ''
    updateTimeRange(null)
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
    filterErrors,
    updateTimeRange,
    rejectTimeRange,
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
