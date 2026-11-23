<script setup lang="ts">
import { ElWatermark } from 'element-plus'
import 'element-plus/es/components/watermark/style/css'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import { appConfig } from '@/config/app'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStore } from '@/store/modules/permission'

import AppHeader from '@/layout/components/AppHeader/index.vue'
import AppLogo from '@/layout/components/AppLogo/index.vue'
import AppMain from '@/layout/components/AppMain/index.vue'
import AppMenu from '@/layout/components/AppMenu/index.vue'
import AppSidebar from '@/layout/components/AppSidebar/index.vue'
import AppTabs from '@/layout/components/AppTabs/index.vue'
import { containsMenuPath } from './menu'

const appStore = useAppStore()
const route = useRoute()
const { sidebarOpened, isMobile, isDark, settings } = storeToRefs(appStore)
const { menus } = storeToRefs(usePermissionStore())

const menuLayout = computed(() => (isMobile.value ? 'sidebar' : settings.value.layout.menuLayout))
const activeSection = computed(() =>
  menus.value.find((item) => containsMenuPath(item, route.meta.activeMenu || route.path))
)
const sidebarItems = computed(() =>
  menuLayout.value === 'mixed' ? (activeSection.value?.children ?? []) : menus.value
)
const showSidebar = computed(
  () =>
    menuLayout.value === 'sidebar' ||
    (menuLayout.value === 'mixed' && sidebarItems.value.length > 0)
)
const watermarkFont = computed(() => ({
  color: isDark.value ? 'rgba(228, 235, 247, 0.12)' : 'rgba(36, 50, 75, 0.12)',
  fontSize: 14
}))
</script>

<template>
  <div class="app-layout" :class="{ 'is-horizontal': menuLayout !== 'sidebar' }">
    <AppHeader class="app-layout__header" :show-sidebar-toggle="showSidebar">
      <template v-if="menuLayout !== 'sidebar'" #navigation>
        <div class="app-layout__top-navigation">
          <AppLogo v-if="settings.layout.showLogo" class="app-layout__top-brand" />
          <AppMenu
            :items="menus"
            horizontal
            :root-only="menuLayout === 'mixed'"
            :active-section="activeSection?.path"
          />
        </div>
      </template>
    </AppHeader>

    <AppSidebar
      v-if="showSidebar"
      class="app-layout__sidebar"
      :items="sidebarItems"
      :section="menuLayout === 'mixed'"
    />

    <div v-if="isMobile && sidebarOpened" class="app-layout__mask" @click="appStore.closeSidebar" />

    <div class="app-layout__container">
      <AppTabs v-if="!isMobile && settings.layout.showTabs" />
      <AppMain />
    </div>

    <div v-if="settings.layout.watermark" class="app-layout__watermark" aria-hidden="true">
      <ElWatermark
        class="app-layout__watermark-tile"
        :content="appConfig.title"
        :font="watermarkFont"
        :gap="[130, 100]"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
