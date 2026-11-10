import type { AppSettings } from './types'

export const DEFAULT_APP_SETTINGS = {
  theme: { mode: 'system' },
  layout: { showLogo: true, showBreadcrumb: true, showTabs: true },
  componentSize: 'default'
} as const satisfies AppSettings

export function createDefaultSettings(): AppSettings {
  return {
    theme: { ...DEFAULT_APP_SETTINGS.theme },
    layout: { ...DEFAULT_APP_SETTINGS.layout },
    componentSize: DEFAULT_APP_SETTINGS.componentSize
  }
}

/** 浏览器中的历史版本或手动修改的设置不能绕过运行时校验。 */
export function resolveAppSettings(value: unknown): AppSettings {
  const result = createDefaultSettings()
  if (!value || typeof value !== 'object') return result
  const saved = value as Partial<AppSettings>
  const mode = saved.theme?.mode
  if (mode === 'light' || mode === 'dark' || mode === 'system') result.theme.mode = mode
  const size = saved.componentSize
  if (size === 'large' || size === 'default' || size === 'small') result.componentSize = size
  for (const key of ['showLogo', 'showBreadcrumb', 'showTabs'] as const) {
    if (typeof saved.layout?.[key] === 'boolean') result.layout[key] = saved.layout[key]
  }
  return result
}
