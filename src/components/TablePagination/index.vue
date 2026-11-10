<script setup lang="ts">
defineProps<{ page: number; pageSize: number; total: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:page': [value: number]; 'update:pageSize': [value: number] }>()
</script>
<template>
  <div class="table-pagination">
    <ElPagination
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      :pager-count="5"
      :disabled="disabled"
      layout="total, sizes, prev, pager, next"
      @update:current-page="emit('update:page', $event)"
      @update:page-size="emit('update:pageSize', $event)"
    />
  </div>
</template>
<style scoped lang="scss">
.table-pagination {
  display: flex;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--np-border-color-lighter);
  overflow-x: auto;
}
// 自动外边距让分页在宽屏居中；溢出时从起点滚动，不裁切首尾按钮。
.table-pagination :deep(.el-pagination) {
  flex-shrink: 0;
  margin-inline: auto;
}
</style>
