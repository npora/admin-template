import type { AppSettings } from './types'

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = {
  theme: {
    mode: 'system'
  },

  layout: {
    showLogo: true,
    showBreadcrumb: true,
    showTabs: true
  }
}