<template>
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped lang="scss">
.app-main {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background-color: var(--np-bg-page);
}
</style>