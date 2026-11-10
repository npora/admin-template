import { computed, nextTick, ref } from 'vue'
import { defineStore } from 'pinia'

interface PageView {
  path: string
  cacheName: string
  keepAlive: boolean
  version: number
  refreshing: boolean
}

export const useViewsStore = defineStore('views', () => {
  const views = ref<PageView[]>([])
  let nextId = 0
  const pendingRefreshes = new Map<string, Promise<void>>()

  const cachedViews = computed(() =>
    views.value.filter((view) => view.keepAlive && !view.refreshing).map((view) => view.cacheName)
  )

  function findView(path: string) {
    return views.value.find((view) => view.path === path)
  }

  function trackView(path: string, keepAlive: boolean): void {
    const existing = findView(path)
    if (existing) {
      existing.keepAlive = keepAlive
      return
    }
    views.value.push({
      path,
      cacheName: `PageView${++nextId}`,
      keepAlive,
      version: 0,
      refreshing: false
    })
  }

  function getViewName(path: string): string | undefined {
    return findView(path)?.cacheName
  }

  function getViewVersion(path: string): number {
    return findView(path)?.version ?? 0
  }

  function removeView(path: string): void {
    views.value = views.value.filter((view) => view.path !== path)
    pendingRefreshes.delete(path)
  }

  function retainViews(paths: readonly string[]): void {
    const retained = new Set(paths)
    for (const view of views.value) {
      if (!retained.has(view.path)) pendingRefreshes.delete(view.path)
    }
    views.value = views.value.filter((view) => retained.has(view.path))
  }

  function refreshView(path: string): Promise<void> {
    const pending = pendingRefreshes.get(path)
    if (pending) return pending

    const view = findView(path)
    if (!view) return Promise.resolve()

    const refresh = async () => {
      try {
        // 先让 KeepAlive 淘汰旧实例，再用新 key 挂载页面。
        view.refreshing = true
        await nextTick()
        if (!views.value.includes(view)) return
        view.version += 1
        await nextTick()
      } finally {
        view.refreshing = false
      }
    }
    const task = refresh().finally(() => {
      if (pendingRefreshes.get(path) === task) pendingRefreshes.delete(path)
    })
    pendingRefreshes.set(path, task)
    return task
  }

  function clear(): void {
    views.value = []
    pendingRefreshes.clear()
  }

  return {
    views,
    cachedViews,
    trackView,
    getViewName,
    getViewVersion,
    removeView,
    retainViews,
    refreshView,
    clear
  }
})
