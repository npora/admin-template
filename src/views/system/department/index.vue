<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import { useI18n } from 'vue-i18n'

import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, OfficeBuilding } from '@element-plus/icons-vue'
import 'element-plus/es/components/message-box/style/css'
import type { DepartmentInput, ManagedDepartment } from '@/api/types/department'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { usePermission } from '@/composables/usePermission'
import { handleRequestError } from '@/api/errors/handling'
import { useDepartmentManagement } from './useDepartmentManagement'
import DepartmentFormDialog from './components/DepartmentFormDialog.vue'

const { t } = useI18n({ useScope: 'global' })

const { hasPermission } = usePermission()
const {
  filters,
  tree,
  rows,
  loading,
  failed,
  saving,
  deletingId,
  load,
  search,
  reset,
  save,
  remove
} = useDepartmentManagement()
const editing = ref<ManagedDepartment | null>(null),
  visible = ref(false),
  parentId = ref<number | null>(null),
  confirming = ref(false)
const busy = computed(() => saving.value || deletingId.value !== undefined)
const count = computed(() => {
  const sum = (nodes: ManagedDepartment[]): number =>
    nodes.reduce((total, node) => total + 1 + sum(node.children ?? []), 0)
  return sum(tree.value)
})
onMounted(() => {
  void load()
})
function open(department: ManagedDepartment | null = null, parent: number | null = null) {
  if (
    busy.value ||
    !hasPermission(department ? 'system:department:update' : 'system:department:create')
  )
    return
  editing.value = department ? { ...department } : null
  parentId.value = parent
  visible.value = true
}
async function submit(input: DepartmentInput) {
  if (await save(input, editing.value?.id)) {
    visible.value = false
    ElMessage.success(t('ui.departmentSaved'))
  }
}
async function confirmDelete(department: ManagedDepartment) {
  if (
    busy.value ||
    confirming.value ||
    department.children?.length ||
    department.userCount ||
    !hasPermission('system:department:delete')
  )
    return
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      t('ui.deleteDepartmentItsDepartmentCodeWillRemainReserved', { value: department.name }),
      t('ui.deleteDepartment'),
      {
        type: 'warning',
        confirmButtonText: t('ui.confirmDeletion'),
        cancelButtonText: t('ui.cancel')
      }
    )
    if (await remove(department.id)) ElMessage.success(t('ui.departmentDeleted'))
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
        <h1>{{ t('ui.departmentManagement') }}</h1>
        <p>{{ t('ui.aClearHierarchyForOrganizedTeamwork') }}</p>
      </div>
      <ElButton
        v-permission="'system:department:create'"
        type="primary"
        :icon="Plus"
        :disabled="busy"
        @click="open()"
        >{{ t('ui.addDepartment') }}</ElButton
      >
    </header>
    <template v-if="hasPermission('system:department:list')">
      <ElForm
        :model="filters"
        class="management-page__filters management-page__filters--compact"
        label-position="top"
        @submit.prevent="search"
        ><ElFormItem :label="t('ui.keyword')"
          ><ElInput
            v-model="filters.keyword"
            :prefix-icon="Search"
            clearable
            :placeholder="t('ui.searchByDepartmentNameOrCode')" /></ElFormItem
        ><ElFormItem :label="t('ui.status')"
          ><ElSelect v-model="filters.status" clearable :placeholder="t('ui.allStatuses')"
            ><ElOption
              v-for="option in SYSTEM_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value" /></ElSelect
        ></ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton type="primary" native-type="submit">{{ t('ui.search') }}</ElButton
          ><ElButton @click="reset">{{ t('ui.reset') }}</ElButton>
        </div></ElForm
      >
      <div class="management-page__table-card">
        <div class="management-page__table-heading">
          <div>
            <h2>{{ t('ui.organizationStructure') }}</h2>
            <span>{{ t('ui.departmentCount', { value: count }) }}</span>
          </div>
          <ElButton :icon="Refresh" :loading="loading" :disabled="busy" @click="load">{{
            t('ui.refresh')
          }}</ElButton>
        </div>
        <ElAlert
          v-if="failed"
          :title="t('ui.couldNotLoadDepartmentsRefreshToTryAgain')"
          type="error"
          :closable="false"
        />
        <DataTable
          :loading="loading"
          :data="rows"
          default-expand-all
          :tree-props="{ children: 'children' }"
        >
          <!-- @vue-generic {ManagedDepartment} -->
          <ElTableColumn :label="t('ui.departmentName')" min-width="210"
            ><template #default="{ row }"
              ><span class="department-name"
                ><ElIcon><OfficeBuilding /></ElIcon>{{ row.name }}</span
              ></template
            ></ElTableColumn
          >
          <ElTableColumn
            prop="code"
            :label="t('ui.departmentCode')"
            min-width="150"
          /><ElTableColumn
            prop="leader"
            :label="t('ui.departmentLead')"
            min-width="100"
          /><ElTableColumn prop="phone" :label="t('ui.phone')" min-width="140" /><ElTableColumn
            prop="userCount"
            :label="t('ui.directUsers')"
            width="100"
          /><ElTableColumn prop="sortOrder" :label="t('ui.sortOrder')" width="80" />
          <!-- @vue-generic {ManagedDepartment} -->
          <ElTableColumn :label="t('ui.status')" width="100"
            ><template #default="{ row }"
              ><span class="status-pill" :class="{ 'is-disabled': row.status === 0 }"
                ><i />{{ row.status === 1 ? t('ui.enabled') : t('ui.disabled') }}</span
              ></template
            ></ElTableColumn
          >
          <!-- @vue-generic {ManagedDepartment} -->
          <ElTableColumn :label="t('ui.actions')" width="240" fixed="right"
            ><template #default="{ row }"
              ><ElButton
                v-permission="'system:department:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              ><ElButton
                v-permission="'system:department:create'"
                link
                type="primary"
                :disabled="busy"
                @click="open(null, row.id)"
                >{{ t('ui.addChildDepartment') }}</ElButton
              ><ElButton
                v-permission="'system:department:delete'"
                link
                type="danger"
                :loading="deletingId === row.id"
                :disabled="busy || !!row.children?.length || !!row.userCount || confirming"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              ></template
            ></ElTableColumn
          >
          <template #empty
            ><ElEmpty :description="t('ui.noMatchingDepartments')" :image-size="80"
          /></template>
        </DataTable>
        <p class="management-page__footnote">{{ t('ui.departmentDeletionHint') }}</p>
      </div> </template
    ><ElResult
      v-else
      icon="warning"
      :title="t('ui.departmentManagementIsNotAvailableToYourAccount')"
    />
    <DepartmentFormDialog
      v-model="visible"
      :department="editing"
      :tree="tree"
      :saving="saving"
      :parent-id="parentId"
      @submit="submit"
    />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
.department-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.department-name .el-icon {
  color: var(--np-color-primary);
}
</style>
