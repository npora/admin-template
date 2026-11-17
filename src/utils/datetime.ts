import dayjs, { type ConfigType } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { readonly, ref } from 'vue'
import { dateTimeConfig } from '@/config/datetime'
import { TIME_ZONE, type AppTimeZone } from '@/types/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
const currentTimeZone = ref<AppTimeZone>(dateTimeConfig.defaultTimeZone)
export const activeTimeZone = readonly(currentTimeZone)
export const WALL_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS'

export function isAppTimeZone(value: unknown): value is AppTimeZone {
  return typeof value === 'string' && Object.values(TIME_ZONE).some((zone) => zone === value)
}
export function applyTimeZone(value: AppTimeZone) {
  if (!isAppTimeZone(value)) return
  currentTimeZone.value = value
  dayjs.tz.setDefault(value)
}
applyTimeZone(dateTimeConfig.defaultTimeZone)

/** 数字是绝对毫秒；没有偏移的字符串按 UTC 解析，避免使用操作系统时区。 */
export function zonedDate(value: ConfigType, zone: AppTimeZone = activeTimeZone.value) {
  return dayjs.utc(value).tz(zone)
}

/** 墙上时间转毫秒。跳时中不存在的时刻拒绝；回拨中重复的时刻选择较早一次。 */
export function parseZonedTime(
  value: string,
  zone: AppTimeZone = activeTimeZone.value
): number | null {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)) return null
  const wall = dayjs.utc(value)
  if (!wall.isValid() || wall.format(WALL_TIME_FORMAT) !== value) return null
  const offsets = new Set(
    [-2, 0, 2].map((days) => zonedDate(wall.valueOf() + days * 86400000, zone).utcOffset())
  )
  const candidates = [...offsets]
    .map((offset) => wall.valueOf() - offset * 60000)
    .filter((timestamp) => zonedDate(timestamp, zone).format(WALL_TIME_FORMAT) === value)
  return candidates.length ? Math.min(...candidates) : null
}
