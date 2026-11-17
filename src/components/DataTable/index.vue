<script setup lang="ts" generic="T extends object">
import { computed, ref, useAttrs } from 'vue'
import type { TableInstance } from 'element-plus'
import type { DataTableInstance, DataTableProps, DataTableSort } from './types'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<DataTableProps<T>>(), {
  loading: false,
  border: true,
  rowKey: 'id',
  pagination: false,
  page: 1,
  pageSize: 10,
  total: 0
})
const paginationOptions = computed(() => {
  const { align = 'center', ...options } =
    typeof props.pagination === 'object' ? props.pagination : {}
  return {
    align,
    props: {
      pageSizes: [10, 20, 50],
      pagerCount: 5,
      layout: 'total, sizes, prev, pager, next',
      ...options
    }
  }
})
const showPagination = computed(
  () =>
    props.pagination &&
    !(paginationOptions.value.props.hideOnSinglePage && props.total <= props.pageSize)
)
const paginationDisabled = computed(() => props.loading || paginationOptions.value.props.disabled)
const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
  'selection-change': [rows: T[]]
  'sort-change': [value: DataTableSort<T>]
}>()
function changePage(value: number) {
  if (!showPagination.value || paginationDisabled.value || value === props.page) return
  if (Number.isSafeInteger(value) && value > 0) emit('update:page', value)
}
function changePageSize(value: number) {
  if (!showPagination.value || paginationDisabled.value || value === props.pageSize) return
  if (Number.isSafeInteger(value) && value > 0) emit('update:pageSize', value)
}
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
    <div
      v-if="showPagination"
      class="data-table__pagination"
      :class="`data-table__pagination--${paginationOptions.align}`"
    >
      <ElPagination
        v-bind="paginationOptions.props"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        :disabled="paginationDisabled"
        @update:current-page="changePage"
        @update:page-size="changePageSize"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
