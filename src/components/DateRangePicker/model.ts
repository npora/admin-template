import dayjs from 'dayjs'
import { parseZonedTime, WALL_TIME_FORMAT, zonedDate } from '@/utils/datetime'
import type { AppTimeZone, TimestampRange } from '@/types/timezone'

export function startOfZonedDay(date: string, zone: AppTimeZone): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dayjs.utc(date).format('YYYY-MM-DD') !== date)
    return null
  const parsed = parseZonedTime(`${date} 00:00:00.000`, zone)
  if (parsed !== null) return parsed
  const normalized = dayjs.tz(`${date} 00:00:00.000`, zone)
  return normalized.format('YYYY-MM-DD') === date ? normalized.valueOf() : null
}
export function toPickerRange(
  value: number[] | null | undefined,
  zone: AppTimeZone,
  withTime: boolean
): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((n) => Number.isSafeInteger(n) && zonedDate(n, zone).isValid())
  )
    return null
  return value.map((n) => zonedDate(n, zone).format(withTime ? WALL_TIME_FORMAT : 'YYYY-MM-DD'))
}
export function fromPickerRange(
  value: unknown,
  zone: AppTimeZone,
  withTime: boolean
): TimestampRange | null {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((n) => typeof n === 'string'))
    return null
  if (!withTime && dayjs.utc(value[1]).format('YYYY-MM-DD') !== value[1]) return null
  const start = withTime ? parseZonedTime(value[0], zone) : startOfZonedDay(value[0], zone)
  const end = withTime
    ? parseZonedTime(value[1], zone)
    : startOfZonedDay(dayjs.utc(value[1]).add(1, 'day').format('YYYY-MM-DD'), zone)
  if (start === null || end === null) return null
  const finalEnd = withTime ? end : end - 1
  return start <= finalEnd ? [start, finalEnd] : null
}
