import { t } from '@/locales'
export const MENU_TYPE_OPTIONS = [
  {
    get label() {
      return t('ui.directory')
    },
    value: 1
  },
  {
    get label() {
      return t('ui.page')
    },
    value: 2
  },
  {
    get label() {
      return t('ui.button')
    },
    value: 3
  }
] as const
