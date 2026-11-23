<script setup lang="ts">
import Forbidden from './403.vue'
import NotFound from './404.vue'

defineProps<{ forbidden: boolean }>()
</script>

<template>
  <Forbidden v-if="forbidden" />
  <NotFound v-else />
</template>
