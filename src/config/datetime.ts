import { TIME_ZONE, type AppTimeZone } from '@/types/timezone'

/** 项目默认值；用户在应用设置中修改后的值保存在本机。 */
export const dateTimeConfig: { defaultTimeZone: AppTimeZone } = {
  defaultTimeZone: TIME_ZONE.SHANGHAI
}
