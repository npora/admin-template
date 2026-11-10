import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useViewsStore } from '@/store/modules/views'
import type { TabItem } from './types'

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([])
  const viewsStore = useViewsStore()

  function addTab(tab: TabItem): void {
    const existing = tabs.value.find((item) => item.path === tab.path)
    if (existing) {
      Object.assign(existing, tab)
    } else {
      tabs.value.push(tab)
    }
  }

  function removeTab(path: string): boolean {
    const tab = tabs.value.find((item) => item.path === path)
    if (!tab || tab.fixed) return false

    tabs.value = tabs.value.filter((item) => item.path !== path)
    viewsStore.removeView(path)
    return true
  }

  function removeOtherTabs(path: string): void {
    tabs.value = tabs.value.filter((item) => item.fixed || item.path === path)
    viewsStore.retainViews(tabs.value.map((item) => item.path))
  }

  function removeAllTabs(): void {
    tabs.value = tabs.value.filter((item) => item.fixed)
    viewsStore.retainViews(tabs.value.map((item) => item.path))
  }

  function refreshTab(path: string): Promise<void> {
    return viewsStore.refreshView(path)
  }

  function clear(): void {
    tabs.value = []
    viewsStore.clear()
  }

  return {
    tabs,
    addTab,
    removeTab,
    removeOtherTabs,
    removeAllTabs,
    refreshTab,
    reset: removeAllTabs,
    clear
  }
})
