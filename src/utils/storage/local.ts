import type { StorageAdapter } from './types'

export const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    return localStorage.getItem(key)
  },

  setItem(key, value) {
    localStorage.setItem(key, value)
  },

  removeItem(key) {
    localStorage.removeItem(key)
  },

  clear() {
    localStorage.clear()
  },

  keys() {
    const keys: string[] = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)

      if (key) {
        keys.push(key)
      }
    }

    return keys
  }
}