<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

import type { ComponentSize, ThemeMode } from '@/store/modules/app/types'

const { locale, localeOptions, enabled, setLocale, resetLocale } = useLocale()

const { t } = useI18n({ useScope: 'global' })

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const appStore = useAppStore()

const { settings } = storeToRefs(appStore)

const themeOptions = computed<
  Array<{
    label: string
    value: ThemeMode
  }>
>(() => [
  {
    label: t('ui.light'),
    value: 'light'
  },
  {
    label: t('ui.dark'),
    value: 'dark'
  },
  {
    label: t('ui.system'),
    value: 'system'
  }
])

const sizeOptions = computed<
  Array<{
    label: string
    value: ComponentSize
  }>
>(() => [
  {
    label: t('ui.large'),
    value: 'large'
  },
  {
    label: t('ui.default'),
    value: 'default'
  },
  {
    label: t('ui.small'),
    value: 'small'
  }
])

function resetPreferences(): void {
  appStore.resetSettings()
  resetLocale()
}

function handleVisibleChange(value: boolean): void {
  emit('update:modelValue', value)
}

function handleThemeChange(value: string | number | boolean): void {
  if (value === 'light' || value === 'dark' || value === 'system') {
    appStore.setTheme(value)
  }
}

function handleSizeChange(value: string | number | boolean): void {
  if (value === 'large' || value === 'default' || value === 'small') {
    appStore.updateSettings({
      componentSize: value
    })
  }
}

function handleLogoChange(value: string | number | boolean): void {
  appStore.updateSettings({
    layout: {
      showLogo: Boolean(value)
    }
  })
}

function handleBreadcrumbChange(value: string | number | boolean): void {
  appStore.updateSettings({
    layout: {
      showBreadcrumb: Boolean(value)
    }
  })
}

function handleTabsChange(value: string | number | boolean): void {
  appStore.updateSettings({
    layout: {
      showTabs: Boolean(value)
    }
  })
}
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    :title="t('ui.appSettings')"
    size="min(340px, 100vw)"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div class="app-settings">
      <section v-if="enabled" class="app-settings__section">
        <h3 class="app-settings__title">{{ t('language.current') }}</h3>
        <ElSelect :model-value="locale" :aria-label="t('language.current')" @change="setLocale">
          <ElOption
            v-for="option in localeOptions"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </ElSelect>
      </section>
      <section class="app-settings__section">
        <h3 class="app-settings__title">{{ t('ui.appearance') }}</h3>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.themeMode') }}</span>

          <ElSegmented
            :model-value="settings.theme.mode"
            :options="themeOptions"
            block
            @change="handleThemeChange"
          />
        </div>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.componentSize') }}</span>

          <ElSegmented
            :model-value="settings.componentSize"
            :options="sizeOptions"
            block
            @change="handleSizeChange"
          />
        </div>
      </section>

      <section class="app-settings__section">
        <h3 class="app-settings__title">{{ t('ui.layout') }}</h3>

        <div class="app-settings__item">
          <span>{{ t('ui.showLogo') }}</span>

          <ElSwitch :model-value="settings.layout.showLogo" @change="handleLogoChange" />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.showBreadcrumbs') }}</span>

          <ElSwitch
            :model-value="settings.layout.showBreadcrumb"
            @change="handleBreadcrumbChange"
          />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.showTabs') }}</span>

          <ElSwitch :model-value="settings.layout.showTabs" @change="handleTabsChange" />
        </div>
      </section>

      <section class="app-settings__section">
        <ElButton class="app-settings__reset" @click="resetPreferences">{{
          t('ui.restoreDefaults')
        }}</ElButton>
      </section>
    </div>
  </ElDrawer>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
