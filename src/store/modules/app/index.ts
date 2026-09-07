import { STORAGE_KEYS } from '@/constants/storage'
import { localStorageService } from '@/utils/storage'

import { DEFAULT_APP_SETTINGS } from './config'
import {
  applyDarkMode,
  resolveDarkMode,
  watchSystemTheme
} from './theme'

import type {
  AppSettings,
  DeviceType,
  ThemeMode
} from './types'

export const useAppStore = defineStore('app', () => {
  const device = ref<DeviceType>('desktop')
  const sidebarOpened = ref(true)

  const settings = ref<AppSettings>({
    theme: {
      ...DEFAULT_APP_SETTINGS.theme
    },
    layout: {
      ...DEFAULT_APP_SETTINGS.layout
    }
  })

  let initialized = false

  let stopSystemThemeWatcher:
    | (() => void)
    | undefined

  const isMobile = computed(
    () => device.value === 'mobile'
  )

  const isDark = computed(() =>
    resolveDarkMode(settings.value.theme.mode)
  )

  function setDevice(value: DeviceType): void {
    device.value = value
  }

  function toggleSidebar(): void {
    sidebarOpened.value = !sidebarOpened.value
  }

  function openSidebar(): void {
    sidebarOpened.value = true
  }

  function closeSidebar(): void {
    sidebarOpened.value = false
  }

  function setTheme(mode: ThemeMode): void {
    settings.value.theme.mode = mode

    syncTheme()
    saveSettings()
  }

  function updateSettings(
    value: Partial<AppSettings>
  ): void {
    if (value.theme) {
      settings.value.theme = {
        ...settings.value.theme,
        ...value.theme
      }
    }

    if (value.layout) {
      settings.value.layout = {
        ...settings.value.layout,
        ...value.layout
      }
    }

    syncTheme()
    saveSettings()
  }

  function syncTheme(): void {
    stopSystemThemeWatcher?.()
    stopSystemThemeWatcher = undefined

    applyDarkMode(isDark.value)

    if (settings.value.theme.mode === 'system') {
      stopSystemThemeWatcher =
        watchSystemTheme(applyDarkMode)
    }
  }

  function saveSettings(): void {
    localStorageService.set(
      STORAGE_KEYS.APP_SETTINGS,
      settings.value
    )
  }

  function restoreSettings(): void {
    const saved =
      localStorageService.get<Partial<AppSettings>>(
        STORAGE_KEYS.APP_SETTINGS
      )

    settings.value = {
      theme: {
        ...DEFAULT_APP_SETTINGS.theme,
        ...saved?.theme
      },
      layout: {
        ...DEFAULT_APP_SETTINGS.layout,
        ...saved?.layout
      }
    }

    syncTheme()
  }

  function resetSettings(): void {
    settings.value = {
      theme: {
        ...DEFAULT_APP_SETTINGS.theme
      },
      layout: {
        ...DEFAULT_APP_SETTINGS.layout
      }
    }

    localStorageService.remove(
      STORAGE_KEYS.APP_SETTINGS
    )

    syncTheme()
  }

  function setup(): void {
    if (initialized) {
      return
    }

    initialized = true

    restoreSettings()
  }

  function dispose(): void {
    stopSystemThemeWatcher?.()
    stopSystemThemeWatcher = undefined

    initialized = false
  }

  return {
    device,
    sidebarOpened,
    settings,

    isMobile,
    isDark,

    setDevice,

    toggleSidebar,
    openSidebar,
    closeSidebar,

    setTheme,
    updateSettings,

    setup,
    dispose,

    restoreSettings,
    resetSettings
  }
})