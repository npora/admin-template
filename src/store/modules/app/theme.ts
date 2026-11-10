import { matchesMedia, watchMedia } from '@/utils/media-query'
import type { ThemeMode } from './types'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function getSystemDarkMode(): boolean {
  return matchesMedia(DARK_MEDIA_QUERY)
}

export function resolveDarkMode(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}

export function applyDarkMode(dark: boolean): void {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark)
}

export function watchSystemTheme(callback: (dark: boolean) => void): () => void {
  return watchMedia(DARK_MEDIA_QUERY, callback)
}
