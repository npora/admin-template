<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

const appStore = useAppStore()

const {
  sidebarOpened,
  settings
} = storeToRefs(appStore)

function toggleTheme(): void {
  const current =
    settings.value.theme.mode

  appStore.setTheme(
    current === 'dark'
      ? 'light'
      : 'dark'
  )
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <button
        class="app-header__action"
        type="button"
        :aria-label="
          sidebarOpened
            ? '收起侧边栏'
            : '展开侧边栏'
        "
        @click="appStore.toggleSidebar"
      >
        {{ sidebarOpened ? '‹' : '›' }}
      </button>
    </div>

    <div class="app-header__right">
      <button
        class="app-header__action"
        type="button"
        aria-label="切换主题"
        @click="toggleTheme"
      >
        {{ appStore.isDark ? '☀' : '☾' }}
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: var(--np-header-height);
  padding: 0 16px;
  background-color: var(--np-bg-container);
  border-bottom: 1px solid var(--np-border-color-light);
}

.app-header__left,
.app-header__right {
  display: flex;
  align-items: center;
  height: 100%;
}

.app-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--np-text-regular);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--np-radius-base);
  transition:
    color var(--np-transition-duration-fast),
    background-color var(--np-transition-duration-fast);

  &:hover {
    color: var(--np-color-primary);
    background-color: var(--np-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--np-color-primary);
    outline-offset: 2px;
  }
}
</style>