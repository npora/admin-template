import { onScopeDispose, reactive, ref } from 'vue'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/modules/role'
import type { ManagedRole, RoleInput, RoleListQuery } from '@/api/types/role'
import type { SystemStatus } from '@/api/types/system'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { usePermission } from '@/composables/usePermission'

export function useRoleManagement() {
  const { hasPermission } = usePermission()
  const filters = reactive({ keyword: '', status: undefined as SystemStatus | undefined })
  const query = reactive<RoleListQuery>({ page: 1, pageSize: 10 })
  const rows = ref<ManagedRole[]>([]),
    total = ref(0),
    loading = ref(false),
    loadFailed = ref(false),
    saving = ref(false)
  const deletingId = ref<number>()
  let controller: AbortController | undefined,
    version = 0,
    disposed = false
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  async function load(): Promise<void> {
    const current = ++version,
      token = getTokenVersion()
    controller?.abort()
    if (disposed || !hasPermission('system:role:list')) {
      rows.value = []
      total.value = 0
      loading.value = false
      return
    }
    controller = new AbortController()
    loading.value = true
    loadFailed.value = false
    try {
      const result = await getRoles({ ...query }, controller.signal)
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
  function changePageSize(size: number) {
    query.pageSize = size
    query.page = 1
    return load()
  }
  async function save(input: RoleInput, id?: number): Promise<boolean> {
    if (
      disposed ||
      saving.value ||
      !hasPermission(id === undefined ? 'system:role:create' : 'system:role:update')
    )
      return false
    saving.value = true
    const token = getTokenVersion()
    try {
      if (id === undefined) await createRole(input)
      else await updateRole(id, input)
      if (disposed || token !== getTokenVersion()) return false
      await load()
      return !disposed && token === getTokenVersion()
    } catch (error) {
      handleRequestError(error)
      return false
    } finally {
      if (!disposed) saving.value = false
    }
  }
  async function remove(id: number): Promise<boolean> {
    if (disposed || deletingId.value !== undefined || !hasPermission('system:role:delete'))
      return false
    deletingId.value = id
    const token = getTokenVersion()
    try {
      await deleteRole(id)
      if (disposed || token !== getTokenVersion()) return false
      await load()
      return !disposed && token === getTokenVersion()
    } catch (error) {
      handleRequestError(error)
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
    load,
    search,
    reset,
    changePage,
    changePageSize,
    save,
    remove
  }
}
