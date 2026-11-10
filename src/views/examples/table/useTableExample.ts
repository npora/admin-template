import { onScopeDispose, ref } from 'vue'
import { usePermission } from '@/composables/usePermission'
import { usePaginatedTable } from '@/composables/usePaginatedTable'
import {
  createTaskSeed,
  queryTasks,
  validTask,
  type TaskInput,
  type DemoTask,
  type TaskFilters
} from './model'

export function useTableExample() {
  const { hasPermission } = usePermission()
  const items = ref(createTaskSeed())
  const mutating = ref(false)
  let disposed = false
  onScopeDispose(() => {
    disposed = true
  })
  let nextId = 33
  let failNext = false
  const table = usePaginatedTable<DemoTask, TaskFilters>({
    filters: () => ({ keyword: '', category: '', status: '' }),
    async fetcher(query, signal) {
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', abort)
          resolve()
        }, 120)
        if (signal.aborted) abort()
        else signal.addEventListener('abort', abort, { once: true })
      })
      if (!hasPermission('system:table:list')) throw new Error('Forbidden')
      if (failNext) {
        failNext = false
        throw new Error('Demo load failure')
      }
      const list = queryTasks(items.value, query)
      return {
        list: list.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: list.length
      }
    }
  })
  async function save(input: TaskInput, id?: number) {
    if (
      disposed ||
      mutating.value ||
      !hasPermission('system:table:list') ||
      !validTask(input) ||
      !hasPermission(id === undefined ? 'system:table:create' : 'system:table:update')
    )
      return false
    const existing = id === undefined ? undefined : items.value.find((item) => item.id === id)
    if (id !== undefined && !existing) return false
    mutating.value = true
    const normalized = { ...input, name: input.name.trim() }
    if (id === undefined) {
      const next = nextId++
      items.value.unshift({
        ...normalized,
        id: next,
        code: `TASK-${String(next).padStart(3, '0')}`,
        createdAt: new Date().toISOString()
      })
    } else {
      Object.assign(existing!, normalized)
    }
    try {
      await table.load()
      return !disposed
    } finally {
      mutating.value = false
    }
  }
  async function remove(ids: readonly number[]) {
    if (
      disposed ||
      mutating.value ||
      !hasPermission('system:table:list') ||
      !hasPermission('system:table:delete')
    )
      return false
    mutating.value = true
    const selected = new Set(ids)
    items.value = items.value.filter((item) => !selected.has(item.id))
    try {
      await table.load()
      return !disposed
    } finally {
      mutating.value = false
    }
  }
  function exportRows(ids: readonly number[]) {
    if (disposed || !hasPermission('system:table:export') || !hasPermission('system:table:list'))
      return []
    return ids.length
      ? items.value.filter((item) => ids.includes(item.id))
      : queryTasks(items.value, {
          ...table.query,
          filters: table.appliedFilters.value,
          sort: table.sort.value
        })
  }
  function simulateFailure() {
    failNext = true
    return table.load()
  }
  return { ...table, save, remove, exportRows, simulateFailure }
}
