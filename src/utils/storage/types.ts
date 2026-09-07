export interface StorageAdapter {
  getItem(key: string): string | null

  setItem(key: string, value: string): void

  removeItem(key: string): void

  clear(): void

  keys(): string[]
}

export interface StorageService {
  get<T>(key: string, defaultValue?: T | null): T | null

  set<T>(key: string, value: T): void

  remove(key: string): void

  has(key: string): boolean

  clear(): void
}