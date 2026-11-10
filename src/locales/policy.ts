import type { AppLocale, I18nConfig } from '@/config/i18n'

export function isSupportedLocale(value: unknown, config: I18nConfig): value is AppLocale {
  return typeof value === 'string' && config.supportedLocales.includes(value as AppLocale)
}

export function resolveInitialLocale(
  config: I18nConfig,
  saved: unknown,
  browserLanguages: readonly string[] = []
): AppLocale {
  if (!config.supportedLocales.includes(config.defaultLocale)) {
    throw new Error('i18n defaultLocale must be included in supportedLocales')
  }
  if (!config.supportedLocales.includes(config.fallbackLocale)) {
    throw new Error('i18n fallbackLocale must be included in supportedLocales')
  }
  if (!config.enabled) return config.defaultLocale
  if (isSupportedLocale(saved, config)) return saved
  if (config.detectBrowserLanguage) {
    for (const language of browserLanguages) {
      const normalized = language.toLowerCase()
      const exact = config.supportedLocales.find((item) => item.toLowerCase() === normalized)
      if (exact) return exact
      const base = config.supportedLocales.find(
        (item) => item.split('-')[0]?.toLowerCase() === normalized.split('-')[0]
      )
      if (base) return base
    }
  }
  return config.defaultLocale
}
