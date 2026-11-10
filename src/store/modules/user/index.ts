import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { t } from '@/locales'
import { useProfileStore } from '../profile'
import type { UserInfo } from './types'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const profiles = useProfileStore()
  const localProfile = computed(() => (userInfo.value ? profiles.get(userInfo.value) : undefined))
  const hasUserInfo = computed(() => userInfo.value !== null)
  const displayName = computed(
    () => localProfile.value?.displayName || userInfo.value?.displayName || t('ui.user')
  )
  const avatar = computed(() =>
    localProfile.value ? localProfile.value.avatar || undefined : userInfo.value?.avatar
  )

  function setUser(value: UserInfo): void {
    userInfo.value = value
  }

  function reset(): void {
    userInfo.value = null
  }

  return { userInfo, hasUserInfo, displayName, avatar, setUser, reset }
})
