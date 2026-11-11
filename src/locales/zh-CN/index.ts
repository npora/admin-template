import elementLocale from 'element-plus/es/locale/lang/zh-cn'
import 'dayjs/locale/zh-cn'
import type { LocaleDefinition } from '../types'
import ui from './ui.json'
import routes from './routes.json'
import language from './language.json'
import errors from './errors.json'
import table from './table.json'
import form from './form.json'
import profile from './profile.json'
import dict from './dict.json'

export default {
  label: '简体中文',
  messages: { ui, routes, language, errors, table, form, profile, dict },
  elementLocale,
  dayjsLocale: 'zh-cn',
  dateFormats: {
    date: 'YYYY-MM-DD',
    dateTime: 'YYYY-MM-DD HH:mm',
    short: 'MM-DD HH:mm',
    time: 'HH:mm:ss'
  }
} satisfies LocaleDefinition
