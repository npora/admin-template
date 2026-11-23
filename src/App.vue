<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useNavigationLoading } from '@/router/navigation-loading'
import { useAppStore } from '@/store/modules/app'

const { elementLocale } = useLocale()

const appStore = useAppStore()

const { settings } = storeToRefs(appStore)
const navigationLoading = useNavigationLoading(useRouter())
</script>

<template>
  <ElConfigProvider
    :size="settings.componentSize"
    :locale="elementLocale"
    :dialog="{ alignCenter: true }"
  >
    <div v-if="navigationLoading" class="app-navigation-progress" aria-hidden="true" />
    <RouterView />
  </ElConfigProvider>
</template>

<style scoped lang="scss">
.app-navigation-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: calc(var(--np-z-index-sidebar) + 2);
  height: 3px;
  overflow: hidden;
  pointer-events: none;
  background: var(--np-primary-soft);

  &::after {
    display: block;
    width: 32%;
    height: 100%;
    background: var(--np-color-primary);
    animation: navigation-progress 1s ease-in-out infinite;
    content: '';
  }
}

@keyframes navigation-progress {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(312.5%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-navigation-progress::after {
    width: 100%;
    animation: none;
  }
}
</style>
