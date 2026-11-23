import type { AppTimeZone } from '@/types/timezone'

export type ThemeMode = 'light' | 'dark' | 'system'

export type DeviceType = 'desktop' | 'mobile'

export type ComponentSize = 'large' | 'default' | 'small'

export type PageTransition = 'fade' | 'slide' | 'none'

export type ThemeAccent =
  'indigo' | 'blue' | 'teal' | 'emerald' | 'violet' | 'rose' | 'amber' | 'orange'

export type MenuLayout = 'sidebar' | 'top' | 'mixed'

export type TabStyle = 'pill' | 'underline' | 'card'

export interface ThemeSettings {
  mode: ThemeMode
  accent: ThemeAccent
  grayscale: boolean
  colorVision: boolean
}

export interface LayoutSettings {
  showLogo: boolean
  showBreadcrumb: boolean
  showTabs: boolean
  pageTransition: PageTransition
  menuLayout: MenuLayout
  tabStyle: TabStyle
  watermark: boolean
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
