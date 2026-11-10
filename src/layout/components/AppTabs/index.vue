<script setup lang="ts">
import { translateRouteTitle } from '@/locales'
import { useI18n } from 'vue-i18n'

import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useTabsStore } from '@/store/modules/tabs'

import type { TabItem } from '@/store/modules/tabs/types'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()

const tabsStore = useTabsStore()

const { tabs } = storeToRefs(tabsStore)

const activePath = computed(() => route.path)

function handleClick(path: string): void {
  if (path === route.path) {
    return
  }

  const tab = tabs.value.find((item) => item.path === path)
  void router.push(tab?.fullPath ?? path)
}

function handleClose(path: string): void {
  const index = tabs.value.findIndex((item) => item.path === path)

  if (index === -1) {
    return
  }

  const tab = tabs.value[index]

  if (!tab || tab.fixed) {
    return
  }

  const isActive = path === route.path

  const removed = tabsStore.removeTab(path)

  if (!removed || !isActive) {
    return
  }

  navigateAfterClose(index)
}

function navigateAfterClose(index: number): void {
  const nextTab = tabs.value[index] ?? tabs.value[index - 1]

  if (nextTab) {
    void router.push(nextTab.fullPath ?? nextTab.path)
    return
  }

  void router.push('/')
}

async function handleRefresh(tab: TabItem): Promise<void> {
  if (route.path !== tab.path) {
    await router.push(tab.fullPath ?? tab.path)
  }

  await tabsStore.refreshTab(tab.path)
}

async function handleContextCommand(
  command: string | number | object,
  tab: TabItem
): Promise<void> {
  if (command === 'refresh') {
    await handleRefresh(tab)
    return
  }

  if (command === 'close') {
    handleClose(tab.path)
    return
  }

  if (command === 'closeOthers') {
    tabsStore.removeOtherTabs(tab.path)

    if (route.path !== tab.path && !tabs.value.some((item) => item.path === route.path)) {
      await router.push(tab.fullPath ?? tab.path)
    }

    return
  }

  if (command === 'closeAll') {
    tabsStore.removeAllTabs()

    const currentExists = tabs.value.some((item) => item.path === route.path)

    if (currentExists) {
      return
    }

    const firstTab = tabs.value[0]

    if (firstTab) {
      await router.push(firstTab.fullPath ?? firstTab.path)

      return
    }

    await router.push('/')
  }
}
</script>

<template>
  <div class="app-tabs">
    <ElScrollbar>
      <div class="app-tabs__list">
        <ElDropdown
          v-for="item in tabs"
          :key="item.path"
          trigger="contextmenu"
          @command="(command) => handleContextCommand(command, item)"
        >
          <div class="app-tabs__item" :class="{ 'is-active': item.path === activePath }">
            <button
              class="app-tabs__trigger"
              type="button"
              :aria-current="item.path === activePath ? 'page' : undefined"
              @click="handleClick(item.path)"
            >
              <span class="app-tabs__title">{{ translateRouteTitle(item.title, item.name) }}</span>
            </button>
            <button
              v-if="!item.fixed"
              class="app-tabs__close"
              type="button"
              :aria-label="t('ui.closeTab', { value: translateRouteTitle(item.title, item.name) })"
              @click.stop="handleClose(item.path)"
            >
              ×
            </button>
          </div>

          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="refresh">{{ t('ui.refreshTab') }}</ElDropdownItem>

              <ElDropdownItem command="close" :disabled="item.fixed" divided>{{
                t('ui.closeCurrentTab')
              }}</ElDropdownItem>

              <ElDropdownItem command="closeOthers">{{ t('ui.closeOtherTabs') }}</ElDropdownItem>

              <ElDropdownItem command="closeAll">{{ t('ui.closeAllTabs') }}</ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </ElScrollbar>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
