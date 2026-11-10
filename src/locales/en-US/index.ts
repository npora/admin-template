import elementLocale from 'element-plus/es/locale/lang/en'
import 'dayjs/locale/en'
import type { LocaleDefinition } from '../types'
import ui from './ui.json'
import routes from './routes.json'
import language from './language.json'
import errors from './errors.json'
import table from './table.json'
import form from './form.json'
import profile from './profile.json'

export default {
  label: 'English',
  messages: { ui, routes, language, errors, table, form, profile },
  elementLocale,
  dayjsLocale: 'en',
  dateFormats: {
    date: 'MMM D, YYYY',
    dateTime: 'MMM D, YYYY h:mm A',
    short: 'MMM D, h:mm A',
    time: 'h:mm:ss A'
  }
} satisfies LocaleDefinition
