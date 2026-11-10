import { registeredLocales, type AppLocale } from '@/locales/registry'

export type { AppLocale } from '@/locales/registry'

export interface I18nConfig {
  enabled: boolean
  defaultLocale: AppLocale
  fallbackLocale: AppLocale
  supportedLocales: readonly AppLocale[]
  detectBrowserLanguage: boolean
}

/** 关闭多语言时固定使用默认语言，忽略保存的偏好并隐藏切换入口。 */
export const i18nConfig: I18nConfig = {
  enabled: true,
  defaultLocale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  supportedLocales: [...registeredLocales],
  detectBrowserLanguage: false
}
