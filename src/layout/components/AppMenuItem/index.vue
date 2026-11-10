<script setup lang="ts">
import { translateRouteTitle } from '@/locales'
import { computed } from 'vue'

import { getIcon } from '@/icons'

import type { MenuItem } from '@/router/types'

defineOptions({
  name: 'AppMenuItem'
})

const props = defineProps<{
  item: MenuItem
}>()

const target = computed(() => ({
  path: props.item.path,
  query: Object.fromEntries(
    Object.entries(props.item.routeQuery ?? {}).map(([key, value]) => [key, String(value)])
  )
}))

const icon = computed(() => getIcon(props.item.icon))
</script>

<template>
  <ElSubMenu v-if="item.children?.length" :index="item.path">
    <template #title>
      <ElIcon v-if="icon" class="app-menu-item__icon">
        <component :is="icon" />
      </ElIcon>

      <span class="app-menu-item__label" :title="translateRouteTitle(item.title, item.name)">{{
        translateRouteTitle(item.title, item.name)
      }}</span>
    </template>

    <AppMenuItem v-for="child in item.children" :key="child.path" :item="child" />
  </ElSubMenu>

  <ElMenuItem v-else :index="item.path" :route="target">
    <ElIcon v-if="icon" class="app-menu-item__icon">
      <component :is="icon" />
    </ElIcon>

    <template #title>
      <span class="app-menu-item__label" :title="translateRouteTitle(item.title, item.name)">{{
        translateRouteTitle(item.title, item.name)
      }}</span>
    </template>
  </ElMenuItem>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
