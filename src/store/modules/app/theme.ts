import { matchesMedia, watchMedia } from '@/utils/media-query'
import type { ThemeMode, ThemeSettings } from './types'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function getSystemDarkMode(): boolean {
  return matchesMedia(DARK_MEDIA_QUERY)
}

export function resolveDarkMode(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}

export function applyThemeAppearance(theme: ThemeSettings, dark: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.npAccent = theme.accent
  root.classList.toggle('np-grayscale', theme.grayscale)
  root.classList.toggle('np-color-vision', theme.colorVision && !theme.grayscale)
}

export function watchSystemTheme(callback: (dark: boolean) => void): () => void {
  return watchMedia(DARK_MEDIA_QUERY, callback)
}
