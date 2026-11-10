<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

import AppLogo from '@/layout/components/AppLogo/index.vue'
import AppMenu from '@/layout/components/AppMenu/index.vue'

const appStore = useAppStore()

const { sidebarOpened, isMobile, settings } = storeToRefs(appStore)

const menuCollapsed = computed(() => !isMobile.value && !sidebarOpened.value)
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{
      'is-collapsed': !isMobile && !sidebarOpened,

      'is-mobile': isMobile,

      'is-mobile-open': isMobile && sidebarOpened
    }"
  >
    <div v-if="settings.layout.showLogo" class="app-sidebar__brand">
      <AppLogo :collapsed="menuCollapsed" />
    </div>

    <ElScrollbar class="app-sidebar__scrollbar">
      <AppMenu :collapse="menuCollapsed" />
    </ElScrollbar>
  </aside>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
