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

  return {
    get() {
      return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN)
    },

    set(token) {
      tokenVersion += 1
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, token)
    },

    remove() {
      tokenVersion += 1
      storage.remove(STORAGE_KEYS.ACCESS_TOKEN)
    }
  } satisfies AuthTokenStorage
}

export const tokenStorage = createTokenStorage()
