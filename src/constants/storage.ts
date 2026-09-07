export const STORAGE_PREFIX = 'npora_admin_'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  APP_SETTINGS: 'app_settings'
} as const

export type StorageKey =
  (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]