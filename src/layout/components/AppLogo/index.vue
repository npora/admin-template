<script setup lang="ts">
import { appConfig } from '@/config/app'

defineProps<{ collapsed?: boolean }>()
</script>
<template>
  <div class="app-logo" :class="{ 'is-collapsed': collapsed }">
    <span class="app-logo__mark">{{ appConfig.title.charAt(0).toUpperCase() }}</span>
    <div v-if="!collapsed" class="app-logo__copy">
      <strong>{{ appConfig.title }}</strong>
    </div>
  </div>
</template>
<style scoped lang="scss">
@use './index.scss';
</style>
