import type { Language } from 'element-plus/es/locale'
import type ui from './zh-CN/ui.json'
import type routes from './zh-CN/routes.json'
import type language from './zh-CN/language.json'
import type errors from './zh-CN/errors.json'
import type table from './zh-CN/table.json'
import type form from './zh-CN/form.json'
import type profile from './zh-CN/profile.json'

export interface LocaleMessages {
  ui: typeof ui
  routes: typeof routes
  language: typeof language
  errors: typeof errors
  table: typeof table
  form: typeof form
  profile: typeof profile
}

export type DateFormat = 'date' | 'dateTime' | 'short' | 'time' | 'heading'

export interface LocaleDefinition {
  label: string
  messages: LocaleMessages
  elementLocale: Language
  dayjsLocale: string
  dateFormats: Record<Exclude<DateFormat, 'heading'>, string>
}
