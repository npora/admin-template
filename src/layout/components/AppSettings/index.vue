<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'
import { useTimeZone } from '@/composables/useTimeZone'
import { computed, ref } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'
import { THEME_ACCENTS } from '@/store/modules/app/config'

import type { ComponentSize, ThemeMode } from '@/store/modules/app/types'

const { locale, localeOptions, enabled, setLocale, resetLocale } = useLocale()
const { timeZone, timeZoneOptions, setTimeZone } = useTimeZone()

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

const accentOptions = computed(() => [
  { value: 'indigo', label: t('ui.themeAccentIndigo'), color: THEME_ACCENTS.indigo },
  { value: 'blue', label: t('ui.themeAccentBlue'), color: THEME_ACCENTS.blue },
  { value: 'teal', label: t('ui.themeAccentTeal'), color: THEME_ACCENTS.teal },
  { value: 'emerald', label: t('ui.themeAccentEmerald'), color: THEME_ACCENTS.emerald },
  { value: 'violet', label: t('ui.themeAccentViolet'), color: THEME_ACCENTS.violet },
  { value: 'rose', label: t('ui.themeAccentRose'), color: THEME_ACCENTS.rose },
  { value: 'amber', label: t('ui.themeAccentAmber'), color: THEME_ACCENTS.amber },
  { value: 'orange', label: t('ui.themeAccentOrange'), color: THEME_ACCENTS.orange }
])

const menuLayoutOptions = computed(() => [
  { value: 'sidebar', label: t('ui.menuLayoutSidebar') },
  { value: 'top', label: t('ui.menuLayoutTop') },
  { value: 'mixed', label: t('ui.menuLayoutMixed') }
])

const tabStyleOptions = computed(() => [
  { value: 'pill', label: t('ui.tabStylePill') },
  { value: 'underline', label: t('ui.tabStyleUnderline') },
  { value: 'card', label: t('ui.tabStyleCard') }
])

const clearingCache = ref(false)

async function clearCache(): Promise<void> {
  if (clearingCache.value) return
  clearingCache.value = true
  try {
    await ElMessageBox.confirm(t('ui.clearCacheConfirm'), t('ui.clearCache'), {
      type: 'warning',
      confirmButtonText: t('ui.clearCache'),
      cancelButtonText: t('ui.cancel')
    })
  } catch {
    clearingCache.value = false
    return
  }
  window.location.reload()
}

function resetPreferences(): void {
  appStore.resetSettings()
  resetLocale()
}

function handleVisibleChange(value: boolean): void {
  emit('update:modelValue', value)
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
        <h3 class="app-settings__title">{{ t('timezone.title') }}</h3>
        <ElSelect
          :model-value="timeZone"
          filterable
          :aria-label="t('timezone.title')"
          @change="setTimeZone"
        >
          <ElOption
            v-for="option in timeZoneOptions"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </ElSelect>
        <p class="app-settings__hint">{{ t('timezone.hint') }}</p>
      </section>
      <section class="app-settings__section">
        <h3 class="app-settings__title">{{ t('ui.appearance') }}</h3>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.themeMode') }}</span>

          <ElSegmented
            :model-value="settings.theme.mode"
            :options="themeOptions"
            block
            @change="appStore.setTheme"
          />
        </div>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.themeAccent') }}</span>
          <ElRadioGroup
            class="app-settings__palette"
            :model-value="settings.theme.accent"
            :aria-label="t('ui.themeAccent')"
            @change="appStore.setThemeAccent"
          >
            <ElRadio
              v-for="item in accentOptions"
              :key="item.value"
              :value="item.value"
              :title="item.label"
            >
              <span
                class="app-settings__swatch"
                :style="{ backgroundColor: item.color }"
                aria-hidden="true"
              >
                <ElIcon v-if="settings.theme.accent === item.value"><Check /></ElIcon>
              </span>
              <span class="app-settings__swatch-name">{{ item.label }}</span>
            </ElRadio>
          </ElRadioGroup>
        </div>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.componentSize') }}</span>

          <ElSegmented
            :model-value="settings.componentSize"
            :options="sizeOptions"
            block
            @change="appStore.setComponentSize"
          />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.grayscaleMode') }}</span>
          <ElSwitch
            :model-value="settings.theme.grayscale"
            :aria-label="t('ui.grayscaleMode')"
            @change="appStore.setThemeFlag('grayscale', $event)"
          />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.colorVisionMode') }}</span>
          <ElSwitch
            :model-value="settings.theme.colorVision"
            :aria-label="t('ui.colorVisionMode')"
            @change="appStore.setThemeFlag('colorVision', $event)"
          />
        </div>
      </section>

      <section class="app-settings__section">
        <h3 class="app-settings__title">{{ t('ui.layout') }}</h3>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.menuLayout') }}</span>
          <ElRadioGroup
            class="app-settings__choices"
            :model-value="settings.layout.menuLayout"
            :aria-label="t('ui.menuLayout')"
            @change="appStore.setMenuLayout"
          >
            <ElRadio v-for="option in menuLayoutOptions" :key="option.value" :value="option.value">
              <span
                class="app-settings__preview app-settings__preview--layout"
                :class="`is-${option.value}`"
                aria-hidden="true"
              >
                <span class="app-settings__preview-bar" />
                <span class="app-settings__preview-side" />
                <span class="app-settings__preview-content" />
              </span>
              <span>{{ option.label }}</span>
            </ElRadio>
          </ElRadioGroup>
        </div>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.tabStyle') }}</span>
          <ElRadioGroup
            class="app-settings__choices"
            :model-value="settings.layout.tabStyle"
            :aria-label="t('ui.tabStyle')"
            @change="appStore.setTabStyle"
          >
            <ElRadio v-for="option in tabStyleOptions" :key="option.value" :value="option.value">
              <span
                class="app-settings__preview app-settings__preview--tabs"
                :class="`is-${option.value}`"
                aria-hidden="true"
              >
                <span class="app-settings__preview-tab is-selected" />
                <span class="app-settings__preview-tab" />
              </span>
              <span>{{ option.label }}</span>
            </ElRadio>
          </ElRadioGroup>
        </div>

        <div class="app-settings__group">
          <span class="app-settings__label">{{ t('ui.pageTransition') }}</span>
          <ElSelect
            :model-value="settings.layout.pageTransition"
            :aria-label="t('ui.pageTransition')"
            @change="appStore.setPageTransition"
          >
            <ElOption value="fade" :label="t('ui.pageTransitionFade')" />
            <ElOption value="slide" :label="t('ui.pageTransitionSlide')" />
            <ElOption value="none" :label="t('ui.pageTransitionNone')" />
          </ElSelect>
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.showLogo') }}</span>

          <ElSwitch
            :model-value="settings.layout.showLogo"
            @change="appStore.setLayoutFlag('showLogo', $event)"
          />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.showBreadcrumbs') }}</span>

          <ElSwitch
            :model-value="settings.layout.showBreadcrumb"
            @change="appStore.setLayoutFlag('showBreadcrumb', $event)"
          />
        </div>

        <div class="app-settings__item">
          <span>{{ t('ui.showTabs') }}</span>

          <ElSwitch
            :model-value="settings.layout.showTabs"
            @change="appStore.setLayoutFlag('showTabs', $event)"
          />
        </div>
      </section>

      <section class="app-settings__section">
        <div class="app-settings__item">
          <span>{{ t('ui.fullscreenWatermark') }}</span>
          <ElSwitch
            :model-value="settings.layout.watermark"
            :aria-label="t('ui.fullscreenWatermark')"
            @change="appStore.setLayoutFlag('watermark', $event)"
          />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="app-settings__actions">
        <ElButton @click="resetPreferences">{{ t('ui.restoreDefaults') }}</ElButton>
        <ElButton type="warning" plain :disabled="clearingCache" @click="clearCache">
          {{ t('ui.clearCache') }}
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
