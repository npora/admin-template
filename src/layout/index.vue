<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

import AppHeader from './components/AppHeader.vue'
import AppMain from './components/AppMain.vue'
import AppSidebar from './components/AppSidebar.vue'

const appStore = useAppStore()

const {
  sidebarOpened,
  isMobile
} = storeToRefs(appStore)
</script>

<template>
  <div
    class="app-layout"
    :class="{
      'is-sidebar-collapsed': !sidebarOpened,
      'is-mobile': isMobile
    }"
  >
    <AppSidebar />

    <div class="app-layout__container">
      <AppHeader />

      <AppMain />
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background-color: var(--np-bg-page);
}

.app-layout__container {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}
</style>