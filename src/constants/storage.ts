export const STORAGE_PREFIX = 'npora_admin_'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  LOCALE: 'locale',
  APP_SETTINGS: 'app_settings',
  FORM_DRAFT: 'form_example_draft',
  LOCAL_PROFILES: 'local_profiles'
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
