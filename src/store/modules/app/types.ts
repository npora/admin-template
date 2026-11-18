import type { AppTimeZone } from '@/types/timezone'

export type ThemeMode = 'light' | 'dark' | 'system'

export type DeviceType = 'desktop' | 'mobile'

export type ComponentSize = 'large' | 'default' | 'small'

export type PageTransition = 'fade' | 'slide' | 'none'

export interface ThemeSettings {
  mode: ThemeMode
}

export interface LayoutSettings {
  showLogo: boolean
  showBreadcrumb: boolean
  showTabs: boolean
  pageTransition: PageTransition
}

export interface AppSettings {
  timeZone: AppTimeZone
  theme: ThemeSettings
  layout: LayoutSettings
  componentSize: ComponentSize
}

export interface AppSettingsPatch {
  timeZone?: AppTimeZone
  theme?: Partial<ThemeSettings>
  layout?: Partial<LayoutSettings>
  componentSize?: ComponentSize
}
