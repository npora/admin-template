<script setup lang="ts">
import { translateRouteTitle } from '@/locales'
import { computed } from 'vue'
import { Document, FolderOpened } from '@element-plus/icons-vue'

import { getIcon } from '@/icons'

import type { MenuItem } from '@/router/types'

defineOptions({
  name: 'AppMenuItem'
})

const props = defineProps<{
  item: MenuItem
  activePath?: string
}>()

// A collapsed popup may not mount its children until first opened.
// Resolve the current branch from menu data so its highlight stays visible.
function containsActivePath(item: MenuItem): boolean {
  return item.path === props.activePath || Boolean(item.children?.some(containsActivePath))
}
const isCurrentBranch = computed(() => Boolean(props.item.children?.some(containsActivePath)))

const target = computed(() => ({
  path: props.item.path,
  query: Object.fromEntries(
    Object.entries(props.item.routeQuery ?? {}).map(([key, value]) => [key, String(value)])
  )
}))

const icon = computed(
  () => getIcon(props.item.icon) ?? (props.item.children?.length ? FolderOpened : Document)
)
</script>

<template>
  <ElSubMenu
    v-if="item.children?.length"
    :index="item.path"
    :class="{ 'is-current-branch': isCurrentBranch }"
    :aria-label="translateRouteTitle(item.title, item.name)"
  >
    <template #title>
      <ElIcon class="app-menu-item__icon" aria-hidden="true">
        <component :is="icon" />
      </ElIcon>

      <span class="app-menu-item__label" :title="translateRouteTitle(item.title, item.name)">{{
        translateRouteTitle(item.title, item.name)
      }}</span>
    </template>

    <AppMenuItem
      v-for="child in item.children"
      :key="child.path"
      :item="child"
      :active-path="activePath"
    />
  </ElSubMenu>

  <ElMenuItem
    v-else
    :index="item.path"
    :route="target"
    :aria-label="translateRouteTitle(item.title, item.name)"
  >
    <ElIcon class="app-menu-item__icon" aria-hidden="true">
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
