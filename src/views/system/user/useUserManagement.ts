import { onScopeDispose, reactive, ref } from 'vue'

import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { createUser, deleteUser, getUsers, updateUser } from '@/api/modules/user'
import type { CreateUserInput, ManagedUser, UserListQuery } from '@/api/types/user'
import type { SystemStatus } from '@/api/types/system'
import type { RoleOption } from '@/api/types/role'
import type { DepartmentOption } from '@/api/types/department'
import { getRoleOptions } from '@/api/modules/role'
import { getDepartmentOptions } from '@/api/modules/department'
import { usePermission } from '@/composables/usePermission'

export function useUserManagement() {
  const { hasPermission } = usePermission()
  const filters = reactive({
    keyword: '',
    roleId: undefined as number | undefined,
    departmentId: undefined as number | undefined,
    status: undefined as SystemStatus | undefined
  })
  const query = reactive<UserListQuery>({ page: 1, pageSize: 10 })
  const roleOptions = ref<RoleOption[]>([])
  const departments = ref<DepartmentOption[]>([])
  const optionsLoading = ref(false)
  async function loadOptions(): Promise<boolean> {
    optionsLoading.value = true
    const tokenVersion = getTokenVersion()
    try {
      const [roles, tree] = await Promise.all([getRoleOptions(), getDepartmentOptions()])
      if (disposed || tokenVersion !== getTokenVersion()) return false
      roleOptions.value = roles
      departments.value = tree
      return true
    } catch (error) {
      handleRequestError(error)
      return false
    } finally {
      if (!disposed) optionsLoading.value = false
    }
  }
  const rows = ref<ManagedUser[]>([])
  const total = ref(0)
  const loading = ref(false)
  const loadFailed = ref(false)
  const saving = ref(false)
  const deletingId = ref<number>()
  let controller: AbortController | undefined
  let loadVersion = 0
  let disposed = false

  onScopeDispose(() => {
    disposed = true
    loadVersion += 1
    controller?.abort()
  })

  async function load(): Promise<void> {
    const version = ++loadVersion
    controller?.abort()
    if (disposed || !hasPermission('system:user:list')) {
      rows.value = []
      total.value = 0
      loading.value = false
      return
    }
    controller = new AbortController()
    const tokenVersion = getTokenVersion()
    loading.value = true
    loadFailed.value = false
    try {
      const result = await getUsers({ ...query }, controller.signal)
      if (disposed || version !== loadVersion || tokenVersion !== getTokenVersion()) return
      const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize))
      if (query.page > lastPage) {
        query.page = lastPage
        await load()
        return
      }
      rows.value = result.list
      total.value = result.total
    } catch (error) {
      if (disposed || version !== loadVersion || tokenVersion !== getTokenVersion()) return
      rows.value = []
      total.value = 0
      loadFailed.value = true
      handleRequestError(error)
    } finally {
      if (!disposed && version === loadVersion) loading.value = false
    }
  }

  function search(): Promise<void> {
    Object.assign(query, { ...filters, keyword: filters.keyword.trim(), page: 1 })
    return load()
  }

  function reset(): Promise<void> {
    Object.assign(filters, {
      keyword: '',
      roleId: undefined,
      departmentId: undefined,
      status: undefined
    })
    return search()
  }

  function changePage(page: number): Promise<void> {
    query.page = page
    return load()
  }

  function changePageSize(size: number): Promise<void> {
    query.pageSize = size
    query.page = 1
    return load()
  }

  async function save(input: CreateUserInput, id?: number): Promise<boolean> {
    const permission = id === undefined ? 'system:user:create' : 'system:user:update'
    if (disposed || saving.value || !hasPermission(permission)) return false
    saving.value = true
    const tokenVersion = getTokenVersion()
    try {
      if (id === undefined) {
        await createUser(input)
      } else {
        const { username: _username, password: _password, ...changes } = input
        await updateUser(id, changes)
      }
      if (disposed || tokenVersion !== getTokenVersion()) return false
      await load()
      return !disposed && tokenVersion === getTokenVersion()
    } catch (error) {
      handleRequestError(error)
      return false
    } finally {
      if (!disposed) saving.value = false
    }
  }

  async function remove(id: number): Promise<boolean> {
    if (
      disposed ||
      deletingId.value !== undefined ||
      rows.value.some((user) => user.id === id && user.isSuperAdmin) ||
      !hasPermission('system:user:delete')
    )
      return false
    deletingId.value = id
    const tokenVersion = getTokenVersion()
    try {
      await deleteUser(id)
      if (disposed || tokenVersion !== getTokenVersion()) return false
      await load()
      return !disposed && tokenVersion === getTokenVersion()
    } catch (error) {
      handleRequestError(error)
      return false
    } finally {
      if (!disposed) deletingId.value = undefined
    }
  }

  return {
    roleOptions,
    departments,
    optionsLoading,
    loadOptions,
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
