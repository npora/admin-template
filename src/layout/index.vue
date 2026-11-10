<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

import AppHeader from '@/layout/components/AppHeader/index.vue'
import AppMain from '@/layout/components/AppMain/index.vue'
import AppSidebar from '@/layout/components/AppSidebar/index.vue'
import AppTabs from '@/layout/components/AppTabs/index.vue'

const appStore = useAppStore()

const { sidebarOpened, isMobile, settings } = storeToRefs(appStore)
</script>

<template>
  <div
    class="app-layout"
    :class="{
      'is-mobile': isMobile
    }"
  >
    <AppSidebar />

    <div v-if="isMobile && sidebarOpened" class="app-layout__mask" @click="appStore.closeSidebar" />

    <div class="app-layout__container">
      <AppHeader />

      <AppTabs v-if="!isMobile && settings.layout.showTabs" />

      <AppMain />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
