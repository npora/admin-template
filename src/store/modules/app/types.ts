export type ThemeMode = 'light' | 'dark' | 'system'

export type DeviceType = 'desktop' | 'mobile'

export type ComponentSize = 'large' | 'default' | 'small'

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
  componentSize: ComponentSize
}

export interface AppSettingsPatch {
  theme?: Partial<ThemeSettings>
  layout?: Partial<LayoutSettings>
  componentSize?: ComponentSize
}
