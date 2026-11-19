import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { useUserStore } from '@/store/modules/user'

export function useUserDialogData<T>(
  getTargetId: () => number | undefined,
  fetchData: (targetId: number, signal: AbortSignal) => Promise<T>
) {
  const userStore = useUserStore()
  const actorId = userStore.userInfo?.id
  const data = shallowRef<T>()
  const loading = ref(false)
  const failed = ref(false)
  let request: AbortController | undefined

  async function reload() {
    const targetId = getTargetId()
    request?.abort()
    if (targetId === undefined || actorId === undefined || actorId !== userStore.userInfo?.id)
      return

    const controller = new AbortController()
    const tokenVersion = getTokenVersion()
    const isCurrent = () =>
      !controller.signal.aborted &&
      tokenVersion === getTokenVersion() &&
      actorId === userStore.userInfo?.id &&
      targetId === getTargetId()
    request = controller
    loading.value = true
    failed.value = false
    try {
      const result = await fetchData(targetId, controller.signal)
      if (isCurrent()) data.value = result
    } catch (error) {
      if (!isCurrent()) return
      failed.value = true
      handleRequestError(error)
    } finally {
      if (request === controller) loading.value = false
    }
  }

  watch(
    [getTargetId, () => userStore.userInfo?.id],
    () => {
      request?.abort()
      data.value = undefined
      loading.value = false
      failed.value = false
      void reload()
    },
    { immediate: true, flush: 'sync' }
  )
  onScopeDispose(() => request?.abort())

  return { data, loading, failed, reload }
}
