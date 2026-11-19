import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { STORAGE_KEYS } from '@/constants/storage'
import { localStorageService } from '@/utils/storage'

import {
  createDefaultSettings,
  resolveAppSettings,
  isThemeMode,
  isComponentSize,
  isPageTransition
} from './config'
import { getDevice, watchDevice } from './responsive'
import { applyDarkMode, getSystemDarkMode, resolveDarkMode, watchSystemTheme } from './theme'
import { applyTimeZone, isAppTimeZone } from '@/utils/datetime'

import type { AppSettings, AppSettingsPatch, DeviceType, LayoutSettings } from './types'

export const useAppStore = defineStore('app', () => {
  const device = ref<DeviceType>(getDevice())

  const desktopSidebarCollapsed = ref(false)

  const mobileSidebarOpened = ref(false)

  const systemDark = ref(getSystemDarkMode())

  const settings = ref<AppSettings>(createDefaultSettings())

  let initialized = false

  let stopSystemThemeWatcher: (() => void) | undefined

  let stopDeviceWatcher: (() => void) | undefined

  const isMobile = computed(() => device.value === 'mobile')

  const sidebarOpened = computed(() =>
    isMobile.value ? mobileSidebarOpened.value : !desktopSidebarCollapsed.value
  )

  const isDark = computed(() => resolveDarkMode(settings.value.theme.mode, systemDark.value))

  function setDevice(value: DeviceType): void {
    device.value = value
  }

  function toggleSidebar(): void {
    if (isMobile.value) {
      mobileSidebarOpened.value = !mobileSidebarOpened.value

      return
    }

    desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value
  }

  function openSidebar(): void {
    if (isMobile.value) {
      mobileSidebarOpened.value = true
      return
    }

    desktopSidebarCollapsed.value = false
  }

  function closeSidebar(): void {
    if (isMobile.value) {
      mobileSidebarOpened.value = false
      return
    }

    desktopSidebarCollapsed.value = true
  }

  function setTheme(mode: unknown): void {
    if (isThemeMode(mode)) updateSettings({ theme: { mode } })
  }

  function setComponentSize(size: unknown): void {
    if (isComponentSize(size)) updateSettings({ componentSize: size })
  }

  function setPageTransition(transition: unknown): void {
    if (isPageTransition(transition)) updateSettings({ layout: { pageTransition: transition } })
  }

  function setLayoutFlag(
    key: Exclude<keyof LayoutSettings, 'pageTransition'>,
    value: unknown
  ): void {
    if (typeof value === 'boolean') updateSettings({ layout: { [key]: value } })
  }

  function updateSettings(value: AppSettingsPatch): void {
    if (isAppTimeZone(value.timeZone)) settings.value.timeZone = value.timeZone
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

    if (value.componentSize) {
      settings.value.componentSize = value.componentSize
    }

    applyTheme()
    saveSettings()
  }

  function applyTheme(): void {
    applyTimeZone(settings.value.timeZone)
    applyDarkMode(isDark.value)
  }

  function setupSystemThemeWatcher(): void {
    stopSystemThemeWatcher?.()

    stopSystemThemeWatcher = watchSystemTheme((dark) => {
      systemDark.value = dark

      if (settings.value.theme.mode === 'system') {
        applyTheme()
      }
    })
  }

  function setupDeviceWatcher(): void {
    stopDeviceWatcher?.()

    stopDeviceWatcher = watchDevice((value) => {
      if (device.value === value) {
        return
      }

      device.value = value

      if (value === 'mobile') {
        mobileSidebarOpened.value = false
      }
    })
  }

  function saveSettings(): void {
    localStorageService.set(STORAGE_KEYS.APP_SETTINGS, settings.value)
  }

  function restoreSettings(): void {
    const saved = localStorageService.get<unknown>(STORAGE_KEYS.APP_SETTINGS)

    settings.value = resolveAppSettings(saved)

    applyTheme()
  }

  function resetSettings(): void {
    settings.value = createDefaultSettings()

    localStorageService.remove(STORAGE_KEYS.APP_SETTINGS)

    applyTheme()
  }

  function setup(): void {
    if (initialized) {
      return
    }

    initialized = true

    device.value = getDevice()

    systemDark.value = getSystemDarkMode()

    mobileSidebarOpened.value = false

    restoreSettings()

    setupSystemThemeWatcher()
    setupDeviceWatcher()
  }

  function dispose(): void {
    stopSystemThemeWatcher?.()
    stopSystemThemeWatcher = undefined

    stopDeviceWatcher?.()
    stopDeviceWatcher = undefined

    initialized = false
  }

  return {
    device,
    sidebarOpened,
    desktopSidebarCollapsed,
    mobileSidebarOpened,
    systemDark,
    settings,

    isMobile,
    isDark,

    setDevice,

    toggleSidebar,
    openSidebar,
    closeSidebar,

    setTheme,
    setComponentSize,
    setPageTransition,
    setLayoutFlag,
    updateSettings,

    setup,
    dispose,

    restoreSettings,
    resetSettings
  }
})
