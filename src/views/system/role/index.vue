<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { useI18n } from 'vue-i18n'

import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import type { ManagedRole, RoleInput } from '@/api/types/role'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { handleRequestError } from '@/api/errors/handling'
import { usePermission } from '@/composables/usePermission'
import { useRoleManagement } from './useRoleManagement'
import RoleFormDialog from './components/RoleFormDialog.vue'
import RoleGrantDialog from './components/RoleGrantDialog.vue'

const { t } = useI18n({ useScope: 'global' })

const { hasPermission } = usePermission()
const {
  filters,
  query,
  rows,
  total,
  loading,
  loadFailed,
  saving,
  deletingId,
  load,
  search,
  reset,
  changePage,
  changePageSize,
  save,
  remove
} = useRoleManagement()
const editing = ref<ManagedRole | null>(null),
  granting = ref<ManagedRole | null>(null)
const formVisible = ref(false),
  grantVisible = ref(false),
  confirming = ref(false)
const busy = computed(() => saving.value || deletingId.value !== undefined)
onMounted(() => {
  void load()
})
function open(role: ManagedRole | null = null) {
  if (busy.value || !hasPermission(role ? 'system:role:update' : 'system:role:create')) return
  editing.value = role ? { ...role } : null
  formVisible.value = true
}
function grant(role: ManagedRole) {
  if (!hasPermission('system:role:grant') || busy.value) return
  granting.value = { ...role }
  grantVisible.value = true
}
async function submit(input: RoleInput) {
  if (await save(input, editing.value?.id)) {
    formVisible.value = false
    ElMessage.success(t('ui.roleSaved'))
  }
}
async function confirmDelete(role: ManagedRole) {
  if (busy.value || confirming.value || role.userCount || !hasPermission('system:role:delete'))
    return
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      t('ui.deleteRoleItsCodeWillRemainReservedAndCannotBeReused', { value: role.name }),
      t('ui.deleteRole'),
      { type: 'warning', confirmButtonText: t('ui.delete'), cancelButtonText: t('ui.cancel') }
    )
    if (await remove(role.id)) ElMessage.success(t('ui.roleDeleted'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    confirming.value = false
  }
}
</script>
<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('ui.organizationAndAccess') }}</span>
        <h1>{{ t('ui.roleManagement') }}</h1>
        <p>{{ t('ui.usersCanHaveMultipleRolesAssignAccessThroughMenusAndButtons') }}</p>
      </div>
      <ElButton
        v-permission="'system:role:create'"
        type="primary"
        :disabled="busy"
        @click="open()"
        >{{ t('ui.addRole') }}</ElButton
      >
    </header>
    <template v-if="hasPermission('system:role:list')">
      <ElAlert
        :title="t('ui.roleChangesHint')"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <ElForm
        :model="filters"
        class="management-page__filters management-page__filters--compact"
        label-position="top"
        @submit.prevent="search"
      >
        <ElFormItem :label="t('ui.keyword')"
          ><ElInput v-model="filters.keyword" clearable :placeholder="t('ui.roleNameOrCode')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.status')"
          ><ElSelect v-model="filters.status" clearable :placeholder="t('ui.allStatuses')"
            ><ElOption
              v-for="option in SYSTEM_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value" /></ElSelect
        ></ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton type="primary" native-type="submit" :loading="loading">{{
            t('ui.search')
          }}</ElButton
          ><ElButton @click="reset">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>
      <div class="management-page__table-card">
        <TableToolbar
          :title="t('ui.roleList')"
          :summary="t('ui.rolesInTotal', { value: total })"
          :loading="loading"
          :disabled="busy"
          @refresh="load"
        />
        <ElAlert
          v-if="loadFailed"
          :title="t('ui.couldNotLoadRolesRefreshToTryAgain')"
          type="error"
          :closable="false"
        />
        <DataTable
          :loading="loading"
          :data="rows"
          pagination
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          :pagination-disabled="loading || busy"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <ElTableColumn prop="name" :label="t('ui.roleName')" min-width="150" /><ElTableColumn
            prop="code"
            :label="t('ui.roleCode')"
            min-width="150"
          /><ElTableColumn
            prop="description"
            :label="t('ui.description')"
            min-width="240"
            show-overflow-tooltip
          /><ElTableColumn prop="sortOrder" :label="t('ui.sortOrder')" width="90" /><ElTableColumn
            prop="userCount"
            :label="t('ui.linkedUsers')"
            width="100"
          />
          <!-- @vue-generic {ManagedRole} -->
          <ElTableColumn :label="t('ui.status')" width="90"
            ><template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                row.status === 1 ? t('ui.enabled') : t('ui.disabled')
              }}</ElTag></template
            ></ElTableColumn
          >
          <!-- @vue-generic {ManagedRole} -->
          <ElTableColumn :label="t('ui.actions')" width="210" fixed="right"
            ><template #default="{ row }"
              ><ElButton
                v-permission="'system:role:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              ><ElButton
                v-permission="'system:role:grant'"
                link
                type="primary"
                :disabled="busy"
                @click="grant(row)"
                >{{ t('ui.permissions') }}</ElButton
              ><ElButton
                v-permission="'system:role:delete'"
                link
                type="danger"
                :disabled="busy || !!row.userCount || confirming"
                :loading="deletingId === row.id"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              ></template
            ></ElTableColumn
          >
          <template #empty
            ><ElEmpty :description="t('ui.noMatchingRoles')" :image-size="72"
          /></template>
        </DataTable>
      </div>
    </template>
    <ElResult v-else icon="warning" :title="t('ui.roleManagementIsNotAvailableToYourAccount')" />
    <RoleFormDialog v-model="formVisible" :role="editing" :saving="saving" @submit="submit" />
    <RoleGrantDialog v-model="grantVisible" :role="granting" />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
</style>
