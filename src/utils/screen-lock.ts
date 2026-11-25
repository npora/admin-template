import { STORAGE_KEYS } from '@/constants/storage'
import { sessionStorageService } from '@/utils/storage'

interface ScreenLock {
  salt: string
  verifier: string
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600000,
      salt: Uint8Array.from(salt.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16))
    },
    key,
    256
  )
  return toHex(new Uint8Array(bits))
}

export function readScreenLock(): ScreenLock | null {
  const saved = sessionStorageService.get<ScreenLock>(STORAGE_KEYS.SCREEN_LOCK)
  if (saved && /^[0-9a-f]{32}$/.test(saved.salt) && /^[0-9a-f]{64}$/.test(saved.verifier))
    return saved
  return null
}

export async function createScreenLock(password: string): Promise<ScreenLock> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, verifier: await derive(password, salt) }
}

export function saveScreenLock(lock: ScreenLock) {
  sessionStorageService.set(STORAGE_KEYS.SCREEN_LOCK, lock)
}

export async function verifyScreenLock(lock: ScreenLock, password: string): Promise<boolean> {
  return (await derive(password, lock.salt)) === lock.verifier
}

export function clearScreenLock() {
  sessionStorageService.remove(STORAGE_KEYS.SCREEN_LOCK)
}
