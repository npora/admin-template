import { MemoryStorageAdapter } from './memory'
import type { StorageAdapter } from './types'

/** 禁用浏览器存储或配额耗尽时退回当前页面内存，不让偏好设置阻断启动。 */
export function createBrowserStorageAdapter(resolve: () => Storage): StorageAdapter {
  const fallback = new MemoryStorageAdapter()
  let unavailable = false

  function run<T>(action: (storage: Storage) => T, backup: () => T): T {
    if (!unavailable) {
      try {
        return action(resolve())
      } catch {
        unavailable = true
      }
    }
    return backup()
  }

  return {
    getItem: (key) =>
      run(
        (storage) => storage.getItem(key),
        () => fallback.getItem(key)
      ),
    setItem: (key, value) =>
      run(
        (storage) => storage.setItem(key, value),
        () => fallback.setItem(key, value)
      ),
    removeItem: (key) =>
      run(
        (storage) => storage.removeItem(key),
        () => fallback.removeItem(key)
      ),
    clear: () =>
      run(
        (storage) => storage.clear(),
        () => fallback.clear()
      ),
    keys: () =>
      run(
        (storage) =>
          Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
            (key): key is string => key !== null
          ),
        () => fallback.keys()
      )
  }
}
