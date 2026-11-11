<script setup lang="ts">
import { computed } from 'vue'
import { useDict } from '@/composables/useDict'
const props = defineProps<{ dictType: string; value?: string | number | null }>()
const { getOption, getLabel } = useDict(() => props.dictType)
const option = computed(() => getOption(props.value))
</script>
<template>
  <ElTag v-if="option" :type="option.tagType">{{ option.label }}</ElTag>
  <span v-else>{{ getLabel(value) }}</span>
</template>
