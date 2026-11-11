<script setup lang="ts">
import { defineComponent, h, watch, type Component, type PropType, type VNode } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useNavigationLoading } from '@/router/navigation-loading'
import { t } from '@/locales'
import waveMarkup from '@/startup/wave.html?raw'
import '@/startup/wave.css'

import { usePageViews } from '@/composables/usePageViews'
import { useViewsStore } from '@/store/modules/views'

usePageViews()

// 非浏览器渲染仅保留过渡结构，不执行 DOM 动画。
const cssTransitions = typeof window !== 'undefined'
const route = useRoute()
const loading = useNavigationLoading(useRouter())
const viewsStore = useViewsStore()
const { cachedViews } = storeToRefs(viewsStore)
const wrappers = new Map<string, { cacheName?: string; component: Component }>()

// 每个路径使用独立的缓存名称，同一组件的参数路由也能分别关闭、刷新。
function getViewWrapper(path: string): Component {
  const cacheName = viewsStore.getViewName(path)
  const existing = wrappers.get(path)
  if (existing && (!cacheName || existing.cacheName === cacheName)) {
    return existing.component
  }

  const component = defineComponent({
    name: cacheName,
    props: { view: { type: Object as PropType<VNode>, required: true } },
    setup: (props) => () => h('div', { class: 'app-page' }, [props.view])
  })
  wrappers.set(path, { cacheName, component })
  return component
}

function getViewKey(path: string): string {
  const name = viewsStore.getViewName(path) ?? wrappers.get(path)?.cacheName ?? path
  return `${name}:${viewsStore.getViewVersion(path)}`
}

watch(
  () => [viewsStore.views.map((view) => view.path), route.path],
  () => {
    const retained = new Set(viewsStore.views.map((view) => view.path))
    for (const path of wrappers.keys()) {
      if (path !== route.path && !retained.has(path)) wrappers.delete(path)
    }
  },
  { flush: 'post' }
)
</script>

<template>
  <main class="app-main" :aria-busy="loading">
    <div class="app-main__content" :inert="loading">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="page-switch" mode="out-in" :css="cssTransitions">
          <KeepAlive :include="cachedViews">
            <component
              :is="getViewWrapper(currentRoute.path)"
              v-if="Component"
              :key="getViewKey(currentRoute.path)"
              :view="Component"
            />
          </KeepAlive>
        </Transition>
      </RouterView>
    </div>
    <div v-if="loading" class="app-main__loading" role="status" aria-live="polite">
      <div>
        <div class="app-main__wave" v-html="waveMarkup"></div>
        <p>{{ t('ui.pageLoading') }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
