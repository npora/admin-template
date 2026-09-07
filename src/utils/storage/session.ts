import type { StorageAdapter } from './types'

export const sessionStorageAdapter: StorageAdapter = {
  getItem(key) {
    return sessionStorage.getItem(key)
  },

  setItem(key, value) {
    sessionStorage.setItem(key, value)
  },

  removeItem(key) {
    sessionStorage.removeItem(key)
  },

  clear() {
    sessionStorage.clear()
  },

  keys() {
    const keys: string[] = []

    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index)

      if (key) {
        keys.push(key)
      }
    }

    return keys
  }
}