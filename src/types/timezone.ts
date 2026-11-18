/** 常用 IANA 时区枚举；const 对象兼容 erasableSyntaxOnly。 */
export const TIME_ZONE = {
  UTC: 'UTC',
  SHANGHAI: 'Asia/Shanghai',
  HONG_KONG: 'Asia/Hong_Kong',
  TAIPEI: 'Asia/Taipei',
  TOKYO: 'Asia/Tokyo',
  SEOUL: 'Asia/Seoul',
  SINGAPORE: 'Asia/Singapore',
  BANGKOK: 'Asia/Bangkok',
  JAKARTA: 'Asia/Jakarta',
  KOLKATA: 'Asia/Kolkata',
  KARACHI: 'Asia/Karachi',
  DUBAI: 'Asia/Dubai',
  RIYADH: 'Asia/Riyadh',
  LONDON: 'Europe/London',
  PARIS: 'Europe/Paris',
  BERLIN: 'Europe/Berlin',
  MOSCOW: 'Europe/Moscow',
  ISTANBUL: 'Europe/Istanbul',
  NEW_YORK: 'America/New_York',
  CHICAGO: 'America/Chicago',
  DENVER: 'America/Denver',
  LOS_ANGELES: 'America/Los_Angeles',
  TORONTO: 'America/Toronto',
  VANCOUVER: 'America/Vancouver',
  MEXICO_CITY: 'America/Mexico_City',
  SAO_PAULO: 'America/Sao_Paulo',
  SYDNEY: 'Australia/Sydney',
  MELBOURNE: 'Australia/Melbourne',
  AUCKLAND: 'Pacific/Auckland',
  HONOLULU: 'Pacific/Honolulu',
  JOHANNESBURG: 'Africa/Johannesburg',
  CAIRO: 'Africa/Cairo'
} as const

export type AppTimeZone = (typeof TIME_ZONE)[keyof typeof TIME_ZONE]
export type TimestampRange = [number, number]
