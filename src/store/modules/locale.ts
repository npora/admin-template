import { defineStore } from 'pinia'
import { computed } from 'vue'
import { i18nConfig } from '@/config/i18n'
import { STORAGE_KEYS } from '@/constants/storage'
import { localStorageService } from '@/utils/storage'
import { applyLocale, i18n } from '@/locales'
import { isSupportedLocale, resolveInitialLocale } from '@/locales/policy'

export const useLocaleStore = defineStore('locale', () => {
  const locale = computed(() => i18n.global.locale.value)
  function setLocale(value: unknown): boolean {
    if (!i18nConfig.enabled || !isSupportedLocale(value, i18nConfig)) return false
    applyLocale(value)
    localStorageService.set(STORAGE_KEYS.LOCALE, value)
    return true
  }
  function restoreLocale(): void {
    const languages = typeof navigator === 'undefined' ? [] : navigator.languages
    applyLocale(
      resolveInitialLocale(i18nConfig, localStorageService.get(STORAGE_KEYS.LOCALE), languages)
    )
  }
  function resetLocale(): void {
    localStorageService.remove(STORAGE_KEYS.LOCALE)
    restoreLocale()
  }
  return { locale, setLocale, restoreLocale, resetLocale }
})
