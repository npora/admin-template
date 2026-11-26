import { createI18n } from 'vue-i18n'
import dayjs, { type ConfigType } from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { i18nConfig, type AppLocale } from '@/config/i18n'
import { localeRegistry, localeMessages } from './registry'
import type { DateFormat } from './types'
import { resolveInitialLocale } from './policy'
import { activeTimeZone, zonedDate } from '@/utils/datetime'

export type { DateFormat } from './types'

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(i18nConfig, null),
  fallbackLocale: i18nConfig.fallbackLocale,
  messages: localeMessages
})

export const t = i18n.global.t

dayjs.extend(localizedFormat)
const zhRoutes = localeRegistry['zh-CN'].messages.routes

export function applyLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  dayjs.locale(localeRegistry[locale].dayjsLocale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

/** 原始菜单标题仍作为业务数据保存；只有模板内置路由的默认名称参与翻译。 */
export function translateRouteTitle(title: string | undefined, name?: unknown): string {
  if (typeof name === 'string' && Object.hasOwn(zhRoutes, name)) {
    const key = name as keyof typeof zhRoutes
    if (title === zhRoutes[key]) return t(`routes.${key}`)
  }
  if (name == null && title === zhRoutes.System) return t('routes.System')
  return title ?? ''
}

export function formatDate(value: ConfigType, format: DateFormat = 'dateTime'): string {
  if (value == null || value === '') return '—'
  // 纯日期不是绝对时刻，不因切换时区移动到前一天。
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? dayjs.utc(value)
      : zonedDate(value)
  if (!date.isValid()) return '—'
  const locale = i18n.global.locale.value
  if (format === 'heading')
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone:
        typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? 'UTC'
          : activeTimeZone.value
    }).format(date.toDate())
  return date
    .locale(localeRegistry[locale].dayjsLocale)
    .format(localeRegistry[locale].dateFormats[format])
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.global.locale.value).format(value)
}

export function formatList(values: readonly string[]): string {
  return new Intl.ListFormat(i18n.global.locale.value, { style: 'short', type: 'unit' }).format(
    values
  )
}
