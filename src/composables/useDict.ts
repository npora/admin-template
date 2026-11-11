import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { storeToRefs } from 'pinia'
import { useDictStore } from '@/store/modules/dict'
import { useUserStore } from '@/store/modules/user'
import { getTokenVersion, tokenStorage } from '@/api/auth/token-storage'
import { handleRequestError, isCancelledRequest } from '@/api/errors/handling'

export function useDict(code: MaybeRefOrGetter<string>) {
  const store = useDictStore()
  const { userInfo } = storeToRefs(useUserStore())
  const key = computed(() => toValue(code))
  const entry = computed(() => store.entries.get(key.value))
  async function load(force = false) {
    if (!tokenStorage.get() || !key.value) return []
    const token = getTokenVersion()
    const currentKey = key.value
    try {
      return await store.load(key.value, force)
    } catch (error) {
      if (token === getTokenVersion() && currentKey === key.value && !isCancelledRequest(error))
        handleRequestError(error)
      return []
    }
  }
  watch(
    [key, () => store.revision, () => userInfo.value?.id],
    () => {
      void load()
    },
    { immediate: true }
  )
  const options = computed(() => entry.value?.options ?? [])
  const getOption = (value: string | number | null | undefined) =>
    value == null ? undefined : options.value.find((option) => option.value === String(value))
  return {
    options,
    loading: computed(() => entry.value?.loading ?? false),
    error: computed(() => entry.value?.error ?? null),
    refresh: () => load(true),
    getOption,
    getLabel: (value: string | number | null | undefined) =>
      getOption(value)?.label ?? (value == null || value === '' ? '—' : String(value))
  }
}
