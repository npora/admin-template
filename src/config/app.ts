import { normalizeApiPrefix } from './env'

export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE?.trim() || 'Npora Admin',
  apiPrefix: normalizeApiPrefix(import.meta.env.VITE_API_PREFIX),
  mockEnabled: import.meta.env.DEV && __MOCK_AVAILABLE__ && import.meta.env.VITE_API_MOCK === 'true'
} as const
