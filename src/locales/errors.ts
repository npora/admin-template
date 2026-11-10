import { i18n } from './index'

import zh from './zh-CN/errors.json'

/** 只翻译前端定义的通用错误；服务端业务消息保留原文。 */
export function translateErrorMessage(message: string): string {
  const key = (Object.keys(zh) as (keyof typeof zh)[]).find((key) => zh[key] === message)
  return key ? i18n.global.t(`errors.${key}`) : message
}
