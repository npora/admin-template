import type { LocaleMessages } from '@/locales/types'
import 'vue-i18n'

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends LocaleMessages {}
}
