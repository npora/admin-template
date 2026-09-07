export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'

export type DeviceType =
  | 'desktop'
  | 'mobile'

export interface ThemeSettings {
  mode: ThemeMode
}

export interface LayoutSettings {
  showLogo: boolean
  showBreadcrumb: boolean
  showTabs: boolean
}

export interface AppSettings {
  theme: ThemeSettings
  layout: LayoutSettings
}