import { onScopeDispose, reactive, ref, shallowRef } from 'vue'

export interface TableSort {
  prop: string
  order: 'ascending' | 'descending' | null
}
export interface TableQuery<F> {
  page: number
  pageSize: number
  filters: F
  sort: TableSort
}

/** fetcher 可对接接口或本地数据；筛选对象使用扁平、可复制的字段。 */
export function usePaginatedTable<T, F extends object>(options: {
  filters: () => F
  fetcher: (query: TableQuery<F>, signal: AbortSignal) => Promise<{ list: T[]; total: number }>
  pageSize?: number
}) {
  const filters = reactive(options.filters()) as F
  const appliedFilters = shallowRef(options.filters())
  const query = reactive({ page: 1, pageSize: options.pageSize ?? 10 })
  const sort = ref<TableSort>({ prop: 'createdAt', order: 'descending' })
  const rows = shallowRef<T[]>([]),
    total = ref(0),
    loading = ref(false),
    failed = ref(false)
  let controller: AbortController | undefined,
    version = 0,
    disposed = false
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  async function load(): Promise<void> {
    if (disposed) return
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    failed.value = false
    try {
      const result = await options.fetcher(
        { ...query, filters: { ...appliedFilters.value }, sort: { ...sort.value } },
        controller.signal
      )
      if (disposed || current !== version) return
      total.value = result.total
      const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize))
      if (query.page > lastPage) {
        query.page = lastPage
        await load()
        return
      }
      rows.value = result.list
    } catch {
      if (!disposed && current === version) {
        failed.value = true
        rows.value = []
        total.value = 0
      }
    } finally {
      if (!disposed && current === version) loading.value = false
    }
  }
  function search() {
    appliedFilters.value = { ...filters }
    query.page = 1
    return load()
  }
  function reset() {
    Object.assign(filters, options.filters())
    return search()
  }
  function changePage(page: number) {
    query.page = Number.isSafeInteger(page) && page > 0 ? page : 1
    return load()
  }
  function changePageSize(size: number) {
    query.pageSize = Number.isSafeInteger(size) && size > 0 ? Math.min(size, 500) : 10
    query.page = 1
    return load()
  }
  function changeSort(value: TableSort) {
    sort.value = { ...value }
    query.page = 1
    return load()
  }
  return {
    filters,
    appliedFilters,
    query,
    sort,
    rows,
    total,
    loading,
    failed,
    load,
    search,
    reset,
    changePage,
    changePageSize,
    changeSort
  }
}
