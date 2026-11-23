<script setup lang="ts">
import { translateRouteTitle } from '@/locales'
import { computed } from 'vue'
import { Document, FolderOpened } from '@element-plus/icons-vue'

import { getIcon } from '@/icons'
import { containsMenuPath, firstMenuPage, menuLocation } from '@/layout/menu'

import type { MenuItem } from '@/router/types'

defineOptions({
  name: 'AppMenuItem'
})

const props = defineProps<{
  item: MenuItem
  activePath?: string
  rootOnly?: boolean
}>()

// A collapsed popup may not mount its children until first opened.
const isCurrentBranch = computed(() =>
  Boolean(props.item.children?.some((child) => containsMenuPath(child, props.activePath)))
)

const target = computed(() => menuLocation(props.rootOnly ? firstMenuPage(props.item) : props.item))

const icon = computed(
  () => getIcon(props.item.icon) ?? (props.item.children?.length ? FolderOpened : Document)
)
</script>

<template>
  <ElSubMenu
    v-if="!rootOnly && item.children?.length"
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
