import { createBrowserStorageAdapter } from './browser'

export const sessionStorageAdapter = createBrowserStorageAdapter(() => sessionStorage)
