<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import { useAppStore } from '@/store/modules/app'

import AppMenuItem from '@/layout/components/AppMenuItem/index.vue'
import type { MenuItem } from '@/router/types'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  items: MenuItem[]
  collapse?: boolean
  horizontal?: boolean
  activeSection?: string
  rootOnly?: boolean
  section?: boolean
}>()

const route = useRoute()
const appStore = useAppStore()

const { isMobile } = storeToRefs(appStore)

const activeMenu = computed(() =>
  props.rootOnly ? (props.activeSection ?? '') : route.meta.activeMenu || route.path
)

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
    :aria-label="t(section ? 'ui.secondaryNavigation' : 'ui.primaryNavigation')"
    :mode="horizontal ? 'horizontal' : 'vertical'"
    :collapse="collapse"
    :collapse-transition="false"
    popper-effect="light"
    popper-class="app-sidebar-popper"
    :popper-offset="10"
    router
    @select="handleSelect"
  >
    <AppMenuItem
      v-for="item in items"
      :key="item.path"
      :item="item"
      :active-path="activeMenu"
      :root-only="rootOnly"
    />
  </ElMenu>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>

<style lang="scss">
@use './popup.scss';
</style>
