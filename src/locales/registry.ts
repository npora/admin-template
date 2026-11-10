import zhCN from './zh-CN'
import enUS from './en-US'
import type { LocaleDefinition, LocaleMessages } from './types'

/** 新语言在此注册；资源、组件语言、日期格式由同一个语言包提供。 */
export const localeRegistry = {
  'zh-CN': zhCN,
  'en-US': enUS
} satisfies Record<string, LocaleDefinition>

export type AppLocale = keyof typeof localeRegistry

export const registeredLocales = Object.keys(localeRegistry) as AppLocale[]

export const localeMessages = Object.fromEntries(
  registeredLocales.map((locale) => [locale, localeRegistry[locale].messages])
) as Record<AppLocale, LocaleMessages>
