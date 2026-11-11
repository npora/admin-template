<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import { usePermissionStore } from '@/store/modules/permission'
import { useAppStore } from '@/store/modules/app'

import AppMenuItem from '@/layout/components/AppMenuItem/index.vue'

defineProps<{
  collapse?: boolean
}>()

const route = useRoute()
const appStore = useAppStore()

const { isMobile } = storeToRefs(appStore)

const { menus: menuItems } = storeToRefs(usePermissionStore())

const activeMenu = computed(() => route.meta.activeMenu || route.path)

function handleSelect(): void {
  if (isMobile.value) {
    appStore.closeSidebar()
  }
}
</script>

<template>
  <ElMenu
    class="app-menu"
    :default-active="activeMenu"
    :collapse="collapse"
    :collapse-transition="false"
    popper-effect="light"
    popper-class="app-sidebar-popper"
    :popper-offset="10"
    router
    @select="handleSelect"
  >
    <AppMenuItem
      v-for="item in menuItems"
      :key="item.path"
      :item="item"
      :active-path="activeMenu"
    />
  </ElMenu>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>

<style lang="scss">
@use './popup.scss';
</style>
