import type { AuthTokenStorage } from '@npora/request/plugins/auth'

import { STORAGE_KEYS } from '@/constants/storage'
import { localStorageService, memoryStorageService, sessionStorageService } from '@/utils/storage'

export type TokenStorageMode = 'session' | 'local' | 'memory'

let tokenVersion = 0

export function getTokenVersion(): number {
  return tokenVersion
}

const DEFAULT_TOKEN_STORAGE_MODE: TokenStorageMode = 'session'

const storageServices = {
  session: sessionStorageService,
  local: localStorageService,
  memory: memoryStorageService
} as const

function isTokenStorageMode(value: string | undefined): value is TokenStorageMode {
  return value === 'session' || value === 'local' || value === 'memory'
}

function resolveTokenStorageMode(): TokenStorageMode {
  const mode = import.meta.env.VITE_TOKEN_STORAGE

  return isTokenStorageMode(mode) ? mode : DEFAULT_TOKEN_STORAGE_MODE
}

export function createTokenStorage(mode: TokenStorageMode = resolveTokenStorageMode()) {
  const storage = storageServices[mode]
  function remembered() {
    if (mode === 'memory') return null
    const value = localStorageService.get<{ token: string; expiresAt: number }>(
      STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN
    )
    if (
      value &&
      typeof value.token === 'string' &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > Date.now()
    )
      return value
    localStorageService.remove(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN)
    return null
  }

  return {
    get() {
      return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN) ?? remembered()?.token ?? null
    },

    set(token: string, persistent?: boolean, expiresAt?: number) {
      tokenVersion += 1
      const previous = remembered()
      const keep =
        mode !== 'memory' &&
        (persistent === true || (persistent === undefined && previous?.token === token))
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN)
      localStorageService.remove(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN)
      if (keep)
        localStorageService.set(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN, {
          token,
          expiresAt:
            expiresAt ??
            (previous?.token === token ? previous.expiresAt : Date.now() + 7 * 86400000)
        })
      else storage.set(STORAGE_KEYS.ACCESS_TOKEN, token)
    },

    remove() {
      tokenVersion += 1
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN)
      localStorageService.remove(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN)
    }
  } satisfies AuthTokenStorage
}

export const tokenStorage = createTokenStorage()
