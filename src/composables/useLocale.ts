import { computed } from 'vue'
import { useLocaleStore } from '@/store/modules/locale'
import { i18nConfig } from '@/config/i18n'
import { localeRegistry } from '@/locales/registry'
import { formatDate, formatNumber } from '@/locales'

export function useLocale() {
  const store = useLocaleStore()
  const locale = computed(() => store.locale)
  const elementLocale = computed(() => localeRegistry[locale.value].elementLocale)
  const localeLabel = computed(() => localeRegistry[locale.value].label)
  const localeOptions = i18nConfig.supportedLocales.map((value) => ({
    value,
    label: localeRegistry[value].label
  }))
  return {
    locale,
    localeLabel,
    elementLocale,
    localeOptions,
    enabled: i18nConfig.enabled,
    setLocale: store.setLocale,
    resetLocale: store.resetLocale,
    formatDate,
    formatNumber
  }
}
