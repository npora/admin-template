import type { UserInfo } from './types'

export const useUserStore = defineStore('user', () => {
  const userInfo =
    ref<UserInfo | null>(null)

  const hasUserInfo = computed(
    () => userInfo.value !== null
  )

  function setUserInfo(
    value: UserInfo
  ): void {
    userInfo.value = value
  }

  function clearUserInfo(): void {
    userInfo.value = null
  }

  function reset(): void {
    clearUserInfo()
  }

  return {
    userInfo,
    hasUserInfo,

    setUserInfo,
    clearUserInfo,
    reset
  }
})