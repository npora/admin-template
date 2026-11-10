<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { Plus, Download, Delete } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { usePermission } from '@/composables/usePermission'
import { useAppStore } from '@/store/modules/app'
import { formatDate, formatNumber } from '@/locales'
import { buildCsv, downloadText, type CsvColumn } from '@/utils/csv'
import type { TableSort } from '@/composables/usePaginatedTable'
import TableToolbar from '@/components/TableToolbar/index.vue'
import DataTable from '@/components/DataTable/index.vue'
import type { DataTableInstance } from '@/components/DataTable/types'
import TaskFormDialog from './components/TaskFormDialog.vue'
import { taskCategories, taskStatuses, type DemoTask, type TaskInput } from './model'
import { useTableExample } from './useTableExample'
const { t } = useI18n({ useScope: 'global' })
const { hasPermission } = usePermission()
const table = useTableExample()
const {
  rows,
  total,
  loading,
  failed,
  filters,
  query,
  load,
  search,
  reset,
  changePage,
  changePageSize
} = table
const size = ref(useAppStore().settings.componentSize)
const visibleColumns = ref(['name', 'category', 'status', 'budget', 'createdAt'])
const columns = computed(() => [
  { key: 'name', label: t('table.name'), required: true },
  { key: 'category', label: t('table.category') },
  { key: 'status', label: t('ui.status') },
  { key: 'budget', label: t('table.budget') },
  { key: 'createdAt', label: t('ui.createdAt') }
])
const tableRef = ref<DataTableInstance>()
const selectedIds = ref<number[]>([])
const dialogVisible = ref(false),
  editing = ref<DemoTask | null>(null),
  saving = ref(false),
  deleting = ref(false),
  confirming = ref(false)
const busy = computed(() => loading.value || saving.value || deleting.value)
onMounted(() => {
  if (hasPermission('system:table:list')) void load()
})
function clearSelection() {
  selectedIds.value = []
  tableRef.value?.clearSelection()
}
function applySearch() {
  clearSelection()
  void search()
}
function resetSearch() {
  clearSelection()
  void reset()
}
function changeSelection(value: DemoTask[]) {
  selectedIds.value = value.map((item) => item.id)
}
function changeSort(value: { prop?: string | null; order?: TableSort['order'] }) {
  void table.changeSort({ prop: value.prop ?? 'createdAt', order: value.order ?? null })
}
function open(task: DemoTask | null = null) {
  if (busy.value || !hasPermission(task ? 'system:table:update' : 'system:table:create')) return
  editing.value = task ? { ...task } : null
  dialogVisible.value = true
}
async function submit(input: TaskInput) {
  if (saving.value) return
  saving.value = true
  try {
    if (await table.save(input, editing.value?.id)) {
      dialogVisible.value = false
      ElMessage.success(t('table.saved'))
    }
  } finally {
    saving.value = false
  }
}
async function confirmDelete(ids: number[]) {
  if (!ids.length || busy.value || confirming.value || !hasPermission('system:table:delete')) return
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      t('table.deleteConfirm', { count: ids.length }),
      t('ui.confirmDeletion'),
      { type: 'warning', confirmButtonText: t('ui.delete'), cancelButtonText: t('ui.cancel') }
    )
    deleting.value = true
    if (await table.remove(ids)) {
      clearSelection()
      ElMessage.success(t('table.deleted'))
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') throw error
  } finally {
    confirming.value = false
    deleting.value = false
  }
}
function exportData() {
  if (busy.value || failed.value || !hasPermission('system:table:export')) return
  const data = table.exportRows(selectedIds.value)
  if (!data.length) {
    ElMessage.info(t('table.nothingToExport'))
    return
  }
  const csvColumns: Record<string, CsvColumn<DemoTask>> = {
    name: { label: t('table.name'), value: (row) => row.name },
    category: { label: t('table.category'), value: (row) => t(`table.${row.category}`) },
    status: { label: t('ui.status'), value: (row) => t(`table.${row.status}`) },
    budget: { label: t('table.budget'), value: (row) => row.budget },
    createdAt: { label: t('ui.createdAt'), value: (row) => formatDate(row.createdAt) }
  }
  downloadText(
    `tasks-${new Date().toISOString().slice(0, 10)}.csv`,
    buildCsv(visibleColumns.value.map((key) => csvColumns[key]!).filter(Boolean), data)
  )
}
</script>
<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('table.eyebrow') }}</span>
        <h1>{{ t('ui.tableExample') }}</h1>
        <p>{{ t('table.description') }}</p>
      </div>
      <ElButton
        v-if="hasPermission('system:table:list')"
        v-permission="'system:table:create'"
        type="primary"
        :icon="Plus"
        :disabled="busy"
        @click="open()"
        >{{ t('table.addTask') }}</ElButton
      >
    </header>
    <template v-if="hasPermission('system:table:list')">
      <ElAlert
        :title="t('table.localNotice')"
        type="info"
        :closable="false"
        show-icon
        class="example-notice"
      />
      <ElForm
        :model="filters"
        class="management-page__filters"
        label-position="top"
        @submit.prevent="applySearch"
      >
        <ElFormItem :label="t('ui.keyword')" class="management-page__keyword"
          ><ElInput v-model="filters.keyword" clearable :placeholder="t('table.searchPlaceholder')"
        /></ElFormItem>
        <ElFormItem :label="t('table.category')"
          ><ElSelect v-model="filters.category" clearable :placeholder="t('table.allCategories')"
            ><ElOption
              v-for="value in taskCategories"
              :key="value"
              :value="value"
              :label="t(`table.${value}`)" /></ElSelect
        ></ElFormItem>
        <ElFormItem :label="t('ui.status')"
          ><ElSelect v-model="filters.status" clearable :placeholder="t('ui.allStatuses')"
            ><ElOption
              v-for="value in taskStatuses"
              :key="value"
              :value="value"
              :label="t(`table.${value}`)" /></ElSelect
        ></ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton type="primary" native-type="submit" :disabled="busy">{{
            t('ui.search')
          }}</ElButton
          ><ElButton :disabled="busy" @click="resetSearch">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>
      <div class="management-page__table-card">
        <TableToolbar
          v-model:visible-columns="visibleColumns"
          v-model:size="size"
          :title="t('table.taskList')"
          :summary="t('table.totalRows', { count: total })"
          :columns="columns"
          :loading="loading"
          :disabled="saving || deleting"
          @refresh="load"
        >
          <ElButton
            v-permission="'system:table:export'"
            :icon="Download"
            :disabled="busy || failed || !total"
            @click="exportData"
            >{{
              selectedIds.length ? t('table.exportSelected') : t('table.exportFiltered')
            }}</ElButton
          >
          <ElButton
            v-permission="'system:table:delete'"
            :icon="Delete"
            :disabled="busy || !selectedIds.length"
            type="danger"
            plain
            @click="confirmDelete(selectedIds)"
            >{{ t('table.deleteSelected') }}</ElButton
          >
        </TableToolbar>
        <div v-if="selectedIds.length" class="example-selection">
          <span>{{ t('table.selectedRows', { count: selectedIds.length }) }}</span
          ><ElButton text @click="clearSelection">{{ t('table.clearSelection') }}</ElButton>
        </div>
        <ElAlert
          v-if="failed"
          :title="t('table.loadFailed')"
          type="error"
          :closable="false"
          show-icon
          ><ElButton text type="primary" @click="load">{{ t('ui.tryAgain') }}</ElButton></ElAlert
        >
        <DataTable
          ref="tableRef"
          :loading="loading"
          :data="rows"
          :size="size"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
          @selection-change="changeSelection"
          @sort-change="changeSort"
          pagination
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          :pagination-disabled="busy"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <ElTableColumn type="selection" width="48" :reserve-selection="true" />
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="visibleColumns.includes('name')"
            prop="name"
            :label="t('table.name')"
            sortable="custom"
            min-width="240"
            ><template #default="{ row }"
              ><div class="example-task">
                <strong>{{ row.name }}</strong
                ><span>{{ row.code }}</span>
              </div></template
            ></ElTableColumn
          >
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="visibleColumns.includes('category')"
            :label="t('table.category')"
            min-width="140"
            ><template #default="{ row }">{{ t(`table.${row.category}`) }}</template></ElTableColumn
          >
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="visibleColumns.includes('status')"
            :label="t('ui.status')"
            min-width="130"
            ><template #default="{ row }"
              ><ElTag
                :type="
                  row.status === 'completed'
                    ? 'success'
                    : row.status === 'active'
                      ? 'primary'
                      : 'info'
                "
                effect="light"
                >{{ t(`table.${row.status}`) }}</ElTag
              ></template
            ></ElTableColumn
          >
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="visibleColumns.includes('budget')"
            prop="budget"
            :label="t('table.budget')"
            sortable="custom"
            min-width="150"
            align="right"
            ><template #default="{ row }">{{ formatNumber(row.budget) }}</template></ElTableColumn
          >
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="visibleColumns.includes('createdAt')"
            prop="createdAt"
            :label="t('ui.createdAt')"
            sortable="custom"
            min-width="210"
            ><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></ElTableColumn
          >
          <!-- @vue-generic {DemoTask} --><ElTableColumn
            v-if="hasPermission(['system:table:update', 'system:table:delete'])"
            :label="t('ui.actions')"
            width="150"
            fixed="right"
            ><template #default="{ row }"
              ><ElButton
                v-permission="'system:table:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              ><ElButton
                v-permission="'system:table:delete'"
                link
                type="danger"
                :disabled="busy"
                @click="confirmDelete([row.id])"
                >{{ t('ui.delete') }}</ElButton
              ></template
            ></ElTableColumn
          >
          <template #empty
            ><ElEmpty
              :description="failed ? t('table.loadFailed') : t('table.empty')"
              :image-size="75"
              ><ElButton v-if="!failed" @click="resetSearch">{{ t('ui.reset') }}</ElButton
              ><ElButton v-else @click="load">{{ t('ui.tryAgain') }}</ElButton></ElEmpty
            ></template
          >
        </DataTable>
        <div class="example-failure">
          <span>{{ t('table.failureHint') }}</span
          ><ElButton text size="small" :disabled="busy" @click="table.simulateFailure">{{
            t('table.simulateFailure')
          }}</ElButton>
        </div>
      </div>
    </template>
    <ElResult v-else icon="warning" :title="t('ui.accessUnavailable')" />
    <TaskFormDialog v-model="dialogVisible" :task="editing" :saving="saving" @submit="submit" />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
:deep(.el-table--small td.el-table__cell) {
  height: 42px;
}
:deep(.el-table--small th.el-table__cell) {
  height: 36px;
}
:deep(.el-table--large td.el-table__cell) {
  height: 68px;
}
:deep(.el-table--large th.el-table__cell) {
  height: 50px;
}
.example-notice {
  margin-bottom: 20px;
}
.example-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--np-primary-soft);
  border-radius: 8px;
  color: var(--np-color-primary);
  font-size: 12px;
}
.example-task {
  strong,
  span {
    display: block;
  }
  strong {
    font-size: 12px;
    font-weight: 500;
  }
  span {
    margin-top: 4px;
    font-size: 10px;
    color: var(--np-text-secondary);
  }
}
.example-failure {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  font-size: 11px;
  color: var(--np-text-secondary);
}
</style>
