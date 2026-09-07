<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/modules/app'

const appStore = useAppStore()

const { sidebarOpened } =
  storeToRefs(appStore)
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{
      'is-collapsed': !sidebarOpened
    }"
  >
    <div class="app-sidebar__brand">
      <span
        v-if="sidebarOpened"
        class="app-sidebar__title"
      >
        Npora Admin
      </span>

      <span
        v-else
        class="app-sidebar__short-title"
      >
        N
      </span>
    </div>

    <div class="app-sidebar__content">
      <!-- Menu 后续接入 -->
    </div>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  flex-shrink: 0;
  width: var(--np-sidebar-width);
  height: 100%;
  overflow: hidden;
  background-color: var(--np-bg-container);
  border-right: 1px solid var(--np-border-color-light);
  transition:
    width var(--np-transition-duration);

  &.is-collapsed {
    width: var(--np-sidebar-collapsed-width);
  }
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--np-header-height);
  overflow: hidden;
  white-space: nowrap;
  border-bottom: 1px solid var(--np-border-color-light);
}

.app-sidebar__title {
  font-size: var(--np-font-size-large);
  font-weight: 600;
}

.app-sidebar__short-title {
  font-size: var(--np-font-size-large);
  font-weight: 600;
}

.app-sidebar__content {
  height: calc(
    100% - var(--np-header-height)
  );
  overflow: auto;
}
</style>