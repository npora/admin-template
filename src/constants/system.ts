import { t } from '@/locales'
import type { SystemStatus } from '@/api/types/system'

export const SYSTEM_STATUS_OPTIONS: { label: string; value: SystemStatus }[] = [
  {
    get label() {
      return t('ui.enabled')
    },
    value: 1
  },
  {
    get label() {
      return t('ui.disabled')
    },
    value: 0
  }
]
