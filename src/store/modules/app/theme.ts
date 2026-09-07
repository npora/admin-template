import type { ThemeMode } from './types'

const DARK_MEDIA_QUERY =
  '(prefers-color-scheme: dark)'

export function getSystemDarkMode(): boolean {
  return window.matchMedia(
    DARK_MEDIA_QUERY
  ).matches
}

export function resolveDarkMode(
  mode: ThemeMode
): boolean {
  if (mode === 'dark') {
    return true
  }

  if (mode === 'light') {
    return false
  }

  return getSystemDarkMode()
}

export function applyDarkMode(
  dark: boolean
): void {
  document.documentElement.classList.toggle(
    'dark',
    dark
  )
}

export function watchSystemTheme(
  callback: (dark: boolean) => void
): () => void {
  const media = window.matchMedia(
    DARK_MEDIA_QUERY
  )

  const listener = (
    event: MediaQueryListEvent
  ) => {
    callback(event.matches)
  }

  media.addEventListener(
    'change',
    listener
  )

  return () => {
    media.removeEventListener(
      'change',
      listener
    )
  }
}