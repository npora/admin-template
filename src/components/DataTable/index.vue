<script setup lang="ts" generic="T extends object">
import { ref, useAttrs } from 'vue'
import type { TableInstance } from 'element-plus'
import type { DataTableInstance, DataTableSort } from './types'
import TablePagination from '@/components/TablePagination/index.vue'

defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{
    data: T[]
    loading?: boolean
    border?: boolean
    rowKey?: string | ((row: T) => string)
    emptyText?: string
    pagination?: boolean
    page?: number
    pageSize?: number
    total?: number
    paginationDisabled?: boolean
  }>(),
  {
    loading: false,
    border: true,
    rowKey: 'id',
    pagination: false,
    page: 1,
    pageSize: 10,
    total: 0,
    paginationDisabled: false
  }
)
const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
  'selection-change': [rows: T[]]
  'sort-change': [value: DataTableSort<T>]
}>()
const attrs = useAttrs()
const tableRef = ref<TableInstance>()
// class/style 属于容器，其余原生表格属性和事件透传；每次渲染读取最新 attrs。
const tableAttrs = () =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
defineExpose<DataTableInstance>({
  clearSelection: () => tableRef.value?.clearSelection(),
  doLayout: () => tableRef.value?.doLayout(),
  getTable: () => tableRef.value
})
</script>

<template>
  <div class="data-table" :class="$attrs.class" :style="$attrs.style" :aria-busy="loading">
    <ElTable
      ref="tableRef"
      v-loading="loading"
      v-bind="tableAttrs()"
      :data="data"
      :border="border"
      :row-key="rowKey"
      @selection-change="emit('selection-change', $event)"
      @sort-change="emit('sort-change', $event)"
    >
      <slot />
      <template #empty>
        <slot name="empty"><ElEmpty :description="emptyText" :image-size="72" /></slot>
      </template>
      <template v-if="$slots.append" #append><slot name="append" /></template>
    </ElTable>
    <TablePagination
      v-if="pagination"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :disabled="loading || paginationDisabled"
      @update:page="emit('update:page', $event)"
      @update:page-size="emit('update:pageSize', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
.data-table {
  width: 100%;
  min-width: 0;
}
</style>
