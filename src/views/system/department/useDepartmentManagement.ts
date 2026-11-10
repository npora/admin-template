import { computed, onScopeDispose, reactive, ref } from 'vue'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '@/api/modules/department'
import type { DepartmentInput, ManagedDepartment } from '@/api/types/department'
import type { SystemStatus } from '@/api/types/system'
import { usePermission } from '@/composables/usePermission'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { filterDepartmentTree } from './tree'

export function useDepartmentManagement() {
  const { hasPermission } = usePermission()
  const filters = reactive({ keyword: '', status: undefined as SystemStatus | undefined })
  const applied = reactive({ keyword: '', status: undefined as SystemStatus | undefined })
  const tree = ref<ManagedDepartment[]>([]),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    deletingId = ref<number>()
  const rows = computed(() => filterDepartmentTree(tree.value, applied.keyword, applied.status))
  let disposed = false,
    version = 0,
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
    if (disposed || !hasPermission('system:department:list')) {
      tree.value = []
      loading.value = false
      return
    }
    controller = new AbortController()
    loading.value = true
    failed.value = false
    try {
      const result = await getDepartments(controller.signal)
      if (!disposed && current === version && token === getTokenVersion()) tree.value = result
    } catch (error) {
      if (!disposed && current === version && token === getTokenVersion()) {
        tree.value = []
        failed.value = true
        handleRequestError(error)
      }
    } finally {
      if (!disposed && current === version) loading.value = false
    }
  }
  function search() {
    Object.assign(applied, filters)
  }
  function reset() {
    filters.keyword = ''
    filters.status = undefined
    search()
  }
  async function save(input: DepartmentInput, id?: number): Promise<boolean> {
    if (
      disposed ||
      saving.value ||
      !hasPermission(id === undefined ? 'system:department:create' : 'system:department:update')
    )
      return false
    saving.value = true
    const token = getTokenVersion()
    try {
      if (id === undefined) await createDepartment(input)
      else await updateDepartment(id, input)
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
    if (disposed || deletingId.value !== undefined || !hasPermission('system:department:delete'))
      return false
    deletingId.value = id
    const token = getTokenVersion()
    try {
      await deleteDepartment(id)
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
    tree,
    rows,
    loading,
    failed,
    saving,
    deletingId,
    load,
    search,
    reset,
    save,
    remove
  }
}
