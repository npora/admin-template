import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissionStore } from '@/store/modules/permission'
import { useTabsStore } from '@/store/modules/tabs'
import { useViewsStore } from '@/store/modules/views'

/** 主内容区独立登记页面；权限刷新后使用新路由记录重建标签与缓存。 */
export function usePageViews(): void {
  const route = useRoute(),
    router = useRouter()
  const permissions = usePermissionStore(),
    tabs = useTabsStore(),
    views = useViewsStore()
  watch(
    () => [route.fullPath, permissions.ready],
    () => {
      if (!permissions.ready) return
      const current = router.resolve(route.fullPath)
      if (current.meta.public || !current.matched.some((record) => record.name === 'Layout')) return
      for (const record of router.getRoutes()) {
        if (
          !record.meta.fixedTab ||
          !record.meta.title ||
          record.meta.hidden ||
          /[:*]/.test(record.path) ||
          tabs.tabs.some((tab) => tab.path === record.path)
        )
          continue
        const target = router.resolve(record.path)
        tabs.addTab({
          path: target.path,
          fullPath: target.fullPath,
          name: typeof record.name === 'string' ? record.name : undefined,
          title: record.meta.title,
          keepAlive: record.meta.keepAlive === true,
          fixed: true
        })
      }
      views.trackView(current.path, current.meta.keepAlive === true)
      if (!current.meta.title || current.meta.hidden) return
      tabs.addTab({
        path: current.path,
        fullPath: current.fullPath,
        name: typeof current.name === 'string' ? current.name : undefined,
        title: current.meta.title,
        keepAlive: current.meta.keepAlive === true,
        fixed: current.meta.fixedTab === true
      })
    },
    { immediate: true }
  )
}
