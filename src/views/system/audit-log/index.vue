<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AUDIT_ACTIONS, AUDIT_RESULTS, type AuditLogEntry } from '@/api/types/audit-log'
import DataTable from '@/components/DataTable/index.vue'
import DateRangePicker from '@/components/DateRangePicker/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { formatDate } from '@/locales'
import { useAppStore } from '@/store/modules/app'
import { useAuditLogTable } from './useAuditLogTable'

const { t } = useI18n({ useScope: 'global' })
const app = useAppStore()
const {
  canList,
  filters,
  filterErrors,
  updateTimeRange,
  rejectTimeRange,
  query,
  rows,
  total,
  loading,
  loadFailed,
  load,
  search,
  reset,
  changePage,
  changePageSize
} = useAuditLogTable()
</script>

<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <h1>{{ t('routes.SystemAuditLog') }}</h1>
      </div>
    </header>
    <template v-if="canList()">
      <ElForm
        :model="filters"
        class="management-page__filters audit-log__filters"
        label-position="top"
        @submit.prevent="search"
      >
        <ElFormItem
          class="audit-log__time-range"
          :label="t('auditLog.timeRange')"
          :error="filterErrors.timeRange ? t('auditLog.invalidTimeRange') : undefined"
        >
          <DateRangePicker
            :model-value="filters.timeRange"
            type="datetimerange"
            :start-placeholder="t('auditLog.timeStart')"
            :end-placeholder="t('auditLog.timeEnd')"
            :single-panel="app.isMobile"
            popper-class="audit-log__time-popper"
            unlink-panels
            @update:model-value="updateTimeRange"
            @invalid="rejectTimeRange"
          />
        </ElFormItem>
        <ElFormItem :label="t('auditLog.action')">
          <ElSelect v-model="filters.action" clearable :placeholder="t('auditLog.allActions')">
            <ElOption
              v-for="action in AUDIT_ACTIONS"
              :key="action"
              :label="t(`auditLog.action_${action}`)"
              :value="action"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('auditLog.result')">
          <ElSelect v-model="filters.result" clearable :placeholder="t('auditLog.allResults')">
            <ElOption
              v-for="result in AUDIT_RESULTS"
              :key="result"
              :label="t(`auditLog.result_${result}`)"
              :value="result"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          :label="t('auditLog.actorId')"
          :error="filterErrors.actorId ? t('auditLog.invalidId') : undefined"
        >
          <ElInput v-model="filters.actorId" inputmode="numeric" clearable />
        </ElFormItem>
        <ElFormItem
          :label="t('auditLog.targetId')"
          :error="filterErrors.targetId ? t('auditLog.invalidId') : undefined"
        >
          <ElInput v-model="filters.targetId" inputmode="numeric" clearable />
        </ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton type="primary" native-type="submit" :loading="loading">{{
            t('ui.search')
          }}</ElButton>
          <ElButton @click="reset">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>
      <div class="management-page__table-card">
        <TableToolbar :title="t('auditLog.records')" :loading="loading" @refresh="load" />
        <ElAlert
          v-if="loadFailed"
          :title="t('auditLog.loadFailed')"
          type="error"
          :closable="false"
        />
        <DataTable
          :data="rows"
          :loading="loading"
          :empty-text="loadFailed ? '—' : t('auditLog.empty')"
          pagination
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <!-- @vue-generic {AuditLogEntry} -->
          <ElTableColumn :label="t('auditLog.createdAt')" min-width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="actorId" :label="t('auditLog.actorId')" min-width="100" />
          <!-- @vue-generic {AuditLogEntry} -->
          <ElTableColumn :label="t('auditLog.action')" min-width="190">
            <template #default="{ row }">{{ t(`auditLog.action_${row.action}`) }}</template>
          </ElTableColumn>
          <!-- @vue-generic {AuditLogEntry} -->
          <ElTableColumn :label="t('auditLog.targetType')" min-width="110">
            <template #default="{ row }">{{ t(`auditLog.target_${row.targetType}`) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="targetId" :label="t('auditLog.targetId')" min-width="100" />
          <!-- @vue-generic {AuditLogEntry} -->
          <ElTableColumn :label="t('auditLog.result')" min-width="100">
            <template #default="{ row }">
              <ElTag :type="row.result === 'success' ? 'success' : 'danger'">
                {{ t(`auditLog.result_${row.result}`) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="statusCode" :label="t('auditLog.statusCode')" min-width="115" />
        </DataTable>
      </div>
    </template>
    <ElResult v-else icon="warning" :title="t('auditLog.forbidden')" />
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/management.scss';

.audit-log__filters {
  grid-template-columns: repeat(4, minmax(0, 1fr));

  .management-page__filter-actions {
    grid-column: span 2;
  }
}

.audit-log__time-range {
  grid-column: span 2;

  :deep(.el-date-editor) {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 1100px) {
  .audit-log__filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  :global(.audit-log__time-popper .el-date-range-picker.single-panel) {
    width: min(322px, calc(100vw - 24px));
  }

  :global(.audit-log__time-popper .el-date-range-picker.single-panel .el-picker-panel__body) {
    min-width: 0;
  }

  :global(.audit-log__time-popper .el-date-range-picker.single-panel .el-picker-panel__content) {
    width: auto;
  }
}
</style>
