export function matchesMedia(query: string): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  )
}

export function watchMedia(query: string, callback: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(query)
  const listener = (event: MediaQueryListEvent) => callback(event.matches)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
