import type {
  AppSettings,
  AppSettingsPatch,
  ComponentSize,
  MenuLayout,
  PageTransition,
  TabStyle,
  ThemeAccent,
  ThemeMode
} from './types'
import { dateTimeConfig } from '@/config/datetime'
import { isAppTimeZone } from '@/utils/datetime'

export const THEME_ACCENTS = {
  indigo: '#4361ee',
  blue: '#1462b6',
  teal: '#087c71',
  emerald: '#337535',
  violet: '#6d45c2',
  rose: '#b23a66',
  amber: '#916008',
  orange: '#af4920'
} as const satisfies Record<ThemeAccent, string>

export const DEFAULT_APP_SETTINGS = {
  timeZone: dateTimeConfig.defaultTimeZone,
  theme: { mode: 'system', accent: 'indigo', grayscale: false, colorVision: false },
  layout: {
    showLogo: true,
    showBreadcrumb: true,
    showTabs: true,
    pageTransition: 'fade',
    menuLayout: 'sidebar',
    tabStyle: 'pill',
    watermark: false
  },
  componentSize: 'default'
} as const satisfies AppSettings

export function createDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    theme: { ...DEFAULT_APP_SETTINGS.theme },
    layout: { ...DEFAULT_APP_SETTINGS.layout }
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

export function isThemeAccent(value: unknown): value is ThemeAccent {
  return typeof value === 'string' && Object.hasOwn(THEME_ACCENTS, value)
}

export function isMenuLayout(value: unknown): value is MenuLayout {
  return value === 'sidebar' || value === 'top' || value === 'mixed'
}

export function isTabStyle(value: unknown): value is TabStyle {
  return value === 'pill' || value === 'underline' || value === 'card'
}

/** 历史设置与局部更新共用字段校验，忽略缺失或无效值。 */
export function resolveAppSettings(
  value: unknown,
  fallback: AppSettings = DEFAULT_APP_SETTINGS
): AppSettings {
  const result = { ...fallback, theme: { ...fallback.theme }, layout: { ...fallback.layout } }
  if (!value || typeof value !== 'object') return result
  const saved = value as AppSettingsPatch
  if (isAppTimeZone(saved.timeZone)) result.timeZone = saved.timeZone
  const mode = saved.theme?.mode
  if (isThemeMode(mode)) result.theme.mode = mode
  const accent = saved.theme?.accent
  if (isThemeAccent(accent)) result.theme.accent = accent
  for (const key of ['grayscale', 'colorVision'] as const) {
    const value = saved.theme?.[key]
    if (typeof value === 'boolean') result.theme[key] = value
  }
  const size = saved.componentSize
  if (isComponentSize(size)) result.componentSize = size
  for (const key of ['showLogo', 'showBreadcrumb', 'showTabs', 'watermark'] as const) {
    const value = saved.layout?.[key]
    if (typeof value === 'boolean') result.layout[key] = value
  }
  const transition = saved.layout?.pageTransition
  if (isPageTransition(transition)) result.layout.pageTransition = transition
  const menuLayout = saved.layout?.menuLayout
  if (isMenuLayout(menuLayout)) result.layout.menuLayout = menuLayout
  const tabStyle = saved.layout?.tabStyle
  if (isTabStyle(tabStyle)) result.layout.tabStyle = tabStyle
  return result
}
