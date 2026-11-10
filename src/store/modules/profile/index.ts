import { defineStore } from 'pinia'
import { ref } from 'vue'
import { localStorageService } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import { profileErrors, resolveProfileMap, type LocalProfile } from './model'

export function profileAccountKey(account: { id: number; username: string }): string {
  return `${account.id}:${account.username}`
}
export const useProfileStore = defineStore('profile', () => {
  const profiles = ref(resolveProfileMap(localStorageService.get(STORAGE_KEYS.LOCAL_PROFILES)))
  function get(account: { id: number; username: string }): LocalProfile | undefined {
    return profiles.value[profileAccountKey(account)]
  }
  function save(account: { id: number; username: string }, input: LocalProfile): boolean {
    if (Object.keys(profileErrors(input)).length) return false
    const normalized = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, value.trim()])
    ) as unknown as LocalProfile
    profiles.value = resolveProfileMap({
      ...profiles.value,
      [profileAccountKey(account)]: normalized
    })
    localStorageService.set(STORAGE_KEYS.LOCAL_PROFILES, profiles.value)
    return Boolean(get(account))
  }
  function reset(account: { id: number; username: string }) {
    delete profiles.value[profileAccountKey(account)]
    localStorageService.set(STORAGE_KEYS.LOCAL_PROFILES, profiles.value)
  }
  return { get, save, reset }
})
