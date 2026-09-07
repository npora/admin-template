import { STORAGE_PREFIX } from '@/constants/storage'

import { localStorageAdapter } from './local'
import { memoryStorageAdapter } from './memory'
import { sessionStorageAdapter } from './session'

import type {
  StorageAdapter,
  StorageService
} from './types'

function createStorage(
  adapter: StorageAdapter,
  prefix = STORAGE_PREFIX
): StorageService {
  const getStorageKey = (key: string) => `${prefix}${key}`

  function get<T>(
    key: string,
    defaultValue: T | null = null
  ): T | null {
    const value = adapter.getItem(getStorageKey(key))

    if (value === null) {
      return defaultValue
    }

    try {
      return JSON.parse(value) as T
    } catch {
      return defaultValue
    }
  }

  function set<T>(key: string, value: T): void {
    adapter.setItem(
      getStorageKey(key),
      JSON.stringify(value)
    )
  }

  function remove(key: string): void {
    adapter.removeItem(getStorageKey(key))
  }

  function has(key: string): boolean {
    return adapter.getItem(getStorageKey(key)) !== null
  }

  function clear(): void {
    const keys = adapter.keys()

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        adapter.removeItem(key)
      }
    }
  }

  return {
    get,
    set,
    remove,
    has,
    clear
  }
}

export const localStorageService =
  createStorage(localStorageAdapter)

export const sessionStorageService =
  createStorage(sessionStorageAdapter)

export const memoryStorageService =
  createStorage(memoryStorageAdapter)

export { createStorage }

export type {
  StorageAdapter,
  StorageService
}