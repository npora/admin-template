<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

const { elementLocale } = useLocale()

const appStore = useAppStore()

const { settings } = storeToRefs(appStore)
</script>

<template>
  <ElConfigProvider :size="settings.componentSize" :locale="elementLocale">
    <RouterView />
  </ElConfigProvider>
</template>
