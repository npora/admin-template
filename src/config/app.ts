import { normalizeApiPrefix } from './env'

export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE?.trim() || 'Npora Admin',
  apiPrefix: normalizeApiPrefix(import.meta.env.VITE_API_PREFIX)
} as const
