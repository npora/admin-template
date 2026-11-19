<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AUDIT_ACTIONS, AUDIT_RESULTS, type AuditLogEntry } from '@/api/types/audit-log'
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { formatDate } from '@/locales'
import { useAuditLogTable } from './useAuditLogTable'

const { t } = useI18n({ useScope: 'global' })
const {
  canList,
  filters,
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
        class="management-page__filters management-page__filters--compact"
        label-position="top"
        @submit.prevent="search"
      >
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
</style>
