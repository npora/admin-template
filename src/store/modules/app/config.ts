import type { AppSettings, ComponentSize, PageTransition, ThemeMode } from './types'
import { dateTimeConfig } from '@/config/datetime'
import { isAppTimeZone } from '@/utils/datetime'

export const DEFAULT_APP_SETTINGS = {
  timeZone: dateTimeConfig.defaultTimeZone,
  theme: { mode: 'system' },
  layout: { showLogo: true, showBreadcrumb: true, showTabs: true, pageTransition: 'fade' },
  componentSize: 'default'
} as const satisfies AppSettings

export function createDefaultSettings(): AppSettings {
  return {
    timeZone: DEFAULT_APP_SETTINGS.timeZone,
    theme: { ...DEFAULT_APP_SETTINGS.theme },
    layout: { ...DEFAULT_APP_SETTINGS.layout },
    componentSize: DEFAULT_APP_SETTINGS.componentSize
  }
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function isComponentSize(value: unknown): value is ComponentSize {
  return value === 'large' || value === 'default' || value === 'small'
}

export function isPageTransition(value: unknown): value is PageTransition {
  return value === 'fade' || value === 'slide' || value === 'none'
}

/** 浏览器中的历史版本或手动修改的设置不能绕过运行时校验。 */
export function resolveAppSettings(value: unknown): AppSettings {
  const result = createDefaultSettings()
  if (!value || typeof value !== 'object') return result
  const saved = value as Partial<AppSettings>
  if (isAppTimeZone(saved.timeZone)) result.timeZone = saved.timeZone
  const mode = saved.theme?.mode
  if (isThemeMode(mode)) result.theme.mode = mode
  const size = saved.componentSize
  if (isComponentSize(size)) result.componentSize = size
  for (const key of ['showLogo', 'showBreadcrumb', 'showTabs'] as const) {
    if (typeof saved.layout?.[key] === 'boolean') result.layout[key] = saved.layout[key]
  }
  const transition = saved.layout?.pageTransition
  if (isPageTransition(transition)) result.layout.pageTransition = transition
  return result
}
