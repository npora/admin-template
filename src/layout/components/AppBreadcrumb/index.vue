<script setup lang="ts">
import { translateRouteTitle } from '@/locales'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()

const breadcrumbs = computed(() =>
  route.matched.filter((item) => item.meta?.title && !item.meta?.hidden)
)
</script>

<template>
  <ElBreadcrumb separator="/" class="app-breadcrumb">
    <ElBreadcrumbItem v-for="item in breadcrumbs" :key="item.path">
      <span :title="translateRouteTitle(item.meta.title, item.name)">{{
        translateRouteTitle(item.meta.title, item.name)
      }}</span>
    </ElBreadcrumbItem>
  </ElBreadcrumb>
</template>

<style scoped lang="scss">
@use 'index';
</style>
