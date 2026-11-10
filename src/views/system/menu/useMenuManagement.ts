import { onScopeDispose, ref } from 'vue'
import { getMenus, createMenu, updateMenu, deleteMenu } from '@/api/modules/menu'
import type { ManagedMenu, MenuInput } from '@/api/types/menu'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { usePermission } from '@/composables/usePermission'

export function useMenuManagement() {
  const { hasPermission } = usePermission()
  const rows = ref<ManagedMenu[]>([]),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false)
  const deletingId = ref<number>()
  let version = 0,
    disposed = false,
    controller: AbortController | undefined
  onScopeDispose(() => {
    disposed = true
    version++
    controller?.abort()
  })
  async function load() {
    const current = ++version,
      token = getTokenVersion()
    controller?.abort()
    if (disposed || !hasPermission('system:menu:list')) {
      rows.value = []
      loading.value = false
      return
    }
    loading.value = true
    failed.value = false
    controller = new AbortController()
    try {
      const tree = await getMenus(controller.signal)
      if (!disposed && current === version && token === getTokenVersion()) rows.value = tree
    } catch (error) {
      if (!disposed && current === version && token === getTokenVersion()) {
        rows.value = []
        failed.value = true
        handleRequestError(error)
      }
    } finally {
      if (!disposed && current === version) loading.value = false
    }
  }
  async function save(input: MenuInput, id?: number): Promise<boolean> {
    if (
      disposed ||
      saving.value ||
      !hasPermission(id === undefined ? 'system:menu:create' : 'system:menu:update')
    )
      return false
    saving.value = true
    const token = getTokenVersion()
    try {
      if (id === undefined) await createMenu(input)
      else await updateMenu(id, input)
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
    if (disposed || deletingId.value !== undefined || !hasPermission('system:menu:delete'))
      return false
    deletingId.value = id
    const token = getTokenVersion()
    try {
      await deleteMenu(id)
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
  return { rows, loading, failed, saving, deletingId, load, save, remove }
}
