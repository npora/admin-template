import { createBrowserStorageAdapter } from './browser'

export const localStorageAdapter = createBrowserStorageAdapter(() => localStorage)
