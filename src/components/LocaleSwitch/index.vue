<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'

const { t } = useI18n({ useScope: 'global' })

const { locale, localeLabel, localeOptions, enabled, setLocale } = useLocale()
</script>
<template>
  <ElDropdown v-if="enabled && localeOptions.length > 1" trigger="click" @command="setLocale">
    <ElButton
      text
      circle
      :aria-label="`${t('language.select')}: ${localeLabel}`"
      :title="`${t('language.select')}: ${localeLabel}`"
      class="locale-switch"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M3 5h12M9 3v2M12 5c-1 5-4 8-8 10M5 8c1.5 2.8 3.5 5 6 6M13 21l4-10 4 10M14.6 17h4.8"
        />
      </svg>
    </ElButton>
    <template #dropdown
      ><ElDropdownMenu>
        <ElDropdownItem
          v-for="option in localeOptions"
          :key="option.value"
          :command="option.value"
          :disabled="option.value === locale"
          >{{ option.label }}</ElDropdownItem
        >
      </ElDropdownMenu></template
    >
  </ElDropdown>
</template>
<style scoped lang="scss">
.locale-switch {
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--np-text-regular);
  &:hover,
  &:focus-visible {
    color: var(--np-color-primary);
    background: var(--np-primary-soft);
  }
  svg {
    display: block;
    flex-shrink: 0;
  }
}
</style>
