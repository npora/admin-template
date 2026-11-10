import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)
  const isSupported = computed(
    () =>
      typeof document !== 'undefined' &&
      typeof document.documentElement.requestFullscreen === 'function'
  )

  function syncFullscreenState(): void {
    isFullscreen.value = typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  }

  async function enterFullscreen(): Promise<boolean> {
    if (!isSupported.value) return false
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      return true
    } catch {
      return false
    }
  }

  async function exitFullscreen(): Promise<boolean> {
    if (!isSupported.value) return false
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      return true
    } catch {
      return false
    }
  }

  function toggleFullscreen(): Promise<boolean> {
    return isFullscreen.value ? exitFullscreen() : enterFullscreen()
  }

  onMounted(() => {
    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
  })
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreenState))

  return { isFullscreen, isSupported, enterFullscreen, exitFullscreen, toggleFullscreen }
}
