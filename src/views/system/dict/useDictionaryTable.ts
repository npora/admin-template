import { computed, onScopeDispose, reactive, ref, shallowRef } from 'vue'
import { usePermission } from '@/composables/usePermission'
import { useDictStore } from '@/store/modules/dict'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import type { DictQuery } from '@/api/types/dict'
import type { PageResult } from '@/api/types/common'
import type { SystemStatus } from '@/api/types/system'

interface Resource<Row, Input> {
  permission: 'dict' | 'dict-item'
  list: (query: DictQuery, signal?: AbortSignal) => Promise<PageResult<Row>>
  create: (input: Input) => Promise<unknown>
  update: (id: number, input: Input) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}
export function useDictionaryTable<Row, Input>(resource: Resource<Row, Input>) {
  const { hasPermission } = usePermission()
  const dictionaries = useDictStore()
  const filters = reactive({ keyword: '', status: undefined as SystemStatus | undefined })
  const query = reactive<DictQuery>({ page: 1, pageSize: 10 })
  const rows = shallowRef<Row[]>([]),
    total = ref(0),
    loading = ref(false),
    loadFailed = ref(false),
    saving = ref(false),
    deletingId = ref<number>()
  const busy = computed(() => saving.value || deletingId.value !== undefined)
  let disposed = false,
    version = 0,
    controller: AbortController | undefined
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  const allowed = (action: string) => hasPermission(`system:${resource.permission}:${action}`)
  async function load(): Promise<void> {
    const current = ++version,
      token = getTokenVersion()
    controller?.abort()
    if (disposed || !allowed('list')) {
      rows.value = []
      total.value = 0
      loading.value = false
      return
    }
    controller = new AbortController()
    loading.value = true
    loadFailed.value = false
    try {
      const result = await resource.list({ ...query }, controller.signal)
      if (disposed || current !== version || token !== getTokenVersion()) return
      const last = Math.max(1, Math.ceil(result.total / query.pageSize))
      if (query.page > last) {
        query.page = last
        await load()
        return
      }
      rows.value = result.list
      total.value = result.total
    } catch (error) {
      if (disposed || current !== version || token !== getTokenVersion()) return
      rows.value = []
      total.value = 0
      loadFailed.value = true
      handleRequestError(error)
    } finally {
      if (!disposed && current === version) loading.value = false
    }
  }
  function search() {
    Object.assign(query, filters, { keyword: filters.keyword.trim(), page: 1 })
    return load()
  }
  function reset() {
    filters.keyword = ''
    filters.status = undefined
    return search()
  }
  function changePage(page: number) {
    query.page = page
    return load()
  }
  function changePageSize(pageSize: number) {
    query.pageSize = pageSize
    query.page = 1
    return load()
  }
  async function save(input: Input, id?: number) {
    if (disposed || busy.value || !allowed(id === undefined ? 'create' : 'update')) return false
    saving.value = true
    const token = getTokenVersion()
    try {
      if (id === undefined) await resource.create(input)
      else await resource.update(id, input)
      if (disposed || token !== getTokenVersion()) return false
      dictionaries.reset()
      await load()
      return !disposed && token === getTokenVersion()
    } catch (error) {
      if (!disposed && token === getTokenVersion()) handleRequestError(error)
      return false
    } finally {
      if (!disposed) saving.value = false
    }
  }
  async function remove(id: number) {
    if (disposed || busy.value || !allowed('delete')) return false
    deletingId.value = id
    const token = getTokenVersion()
    try {
      await resource.remove(id)
      if (disposed || token !== getTokenVersion()) return false
      dictionaries.reset()
      await load()
      return !disposed && token === getTokenVersion()
    } catch (error) {
      if (!disposed && token === getTokenVersion()) handleRequestError(error)
      return false
    } finally {
      if (!disposed) deletingId.value = undefined
    }
  }
  return {
    filters,
    query,
    rows,
    total,
    loading,
    loadFailed,
    saving,
    deletingId,
    busy,
    allowed,
    load,
    search,
    reset,
    changePage,
    changePageSize,
    save,
    remove
  }
}
