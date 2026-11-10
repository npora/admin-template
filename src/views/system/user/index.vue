<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { useI18n } from 'vue-i18n'

import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { Delete, EditPen, Plus, Search } from '@element-plus/icons-vue'
import { formatDate } from '@/locales'
import 'element-plus/es/components/message-box/style/css'

import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { handleRequestError } from '@/api/errors/handling'
import type { CreateUserInput, ManagedUser } from '@/api/types/user'
import { usePermission } from '@/composables/usePermission'
import { useUserManagement } from './useUserManagement'
import UserFormDialog from './components/UserFormDialog.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({ name: 'SystemUser' })

const { hasPermission } = usePermission()
const {
  roleOptions,
  departments,
  optionsLoading,
  loadOptions,
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
} = useUserManagement()
const dialogVisible = ref(false)
const editingUser = ref<ManagedUser | null>(null)
const confirmingDelete = ref(false)
const canManage = computed(
  () => hasPermission('system:user:update') || hasPermission('system:user:delete')
)
const busy = computed(() => saving.value || deletingId.value !== undefined)

onMounted(() => {
  if (hasPermission('system:user:list')) {
    void load()
    void loadOptions()
  }
})

async function openForm(user: ManagedUser | null = null): Promise<void> {
  if (
    busy.value ||
    optionsLoading.value ||
    !hasPermission(user ? 'system:user:update' : 'system:user:create')
  )
    return
  if (!(await loadOptions())) return
  editingUser.value = user ? { ...user, roleIds: [...user.roleIds] } : null
  dialogVisible.value = true
}

async function submitForm(input: CreateUserInput): Promise<void> {
  const editing = editingUser.value !== null
  if (await save(input, editingUser.value?.id)) {
    dialogVisible.value = false
    ElMessage.success(editing ? t('ui.userUpdated') : t('ui.userCreated'))
  }
}

async function confirmDelete(user: ManagedUser): Promise<void> {
  if (
    busy.value ||
    confirmingDelete.value ||
    user.isSuperAdmin ||
    !hasPermission('system:user:delete')
  )
    return
  confirmingDelete.value = true
  try {
    await ElMessageBox.confirm(
      t('ui.confirmDeleteUser', { value: user.displayName, value1: user.username }),
      t('ui.deleteUser'),
      {
        type: 'warning',
        confirmButtonText: t('ui.confirmDeletion'),
        cancelButtonText: t('ui.cancel')
      }
    )
    if (await remove(user.id)) ElMessage.success(t('ui.userDeleted'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    confirmingDelete.value = false
  }
}
</script>

<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('ui.organizationAndAccess') }}</span>
        <h1>{{ t('ui.userManagement') }}</h1>
        <p>{{ t('ui.manageUserProfilesRolesAndAccountStatus') }}</p>
      </div>
      <ElButton
        v-permission="'system:user:create'"
        type="primary"
        :icon="Plus"
        :disabled="busy || optionsLoading"
        @click="openForm()"
        >{{ t('ui.addUser') }}</ElButton
      >
    </header>

    <template v-if="hasPermission('system:user:list')">
      <ElForm
        class="management-page__filters management-page__filters--wide"
        :model="filters"
        label-position="top"
        @submit.prevent="search"
      >
        <ElFormItem :label="t('ui.keyword')" class="management-page__keyword">
          <ElInput
            v-model="filters.keyword"
            :placeholder="t('ui.searchByUsernameDisplayNameOrEmail')"
            maxlength="100"
            clearable
            :prefix-icon="Search"
          />
        </ElFormItem>
        <ElFormItem :label="t('ui.assignedDepartment')"
          ><ElTreeSelect
            v-model="filters.departmentId"
            :data="departments"
            node-key="id"
            value-key="id"
            :props="{ label: 'name', children: 'children' }"
            check-strictly
            clearable
            :placeholder="t('ui.allDepartmentsIncludingDescendants')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.roleLabel')">
          <ElSelect v-model="filters.roleId" :placeholder="t('ui.allRoles')" clearable>
            <ElOption
              v-for="option in roleOptions"
              :key="option.id"
              :label="option.name"
              :value="option.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('ui.status')">
          <ElSelect v-model="filters.status" :placeholder="t('ui.allStatuses')" clearable>
            <ElOption
              v-for="option in SYSTEM_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton
            type="primary"
            native-type="submit"
            :loading="loading"
            :disabled="busy"
            :icon="Search"
            >{{ t('ui.search') }}</ElButton
          >
          <ElButton :disabled="busy" @click="reset">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>

      <div class="management-page__table-card" :aria-busy="loading">
        <TableToolbar
          :title="t('ui.userList')"
          :summary="t('ui.usersInTotal', { value: total }, total)"
          :loading="loading"
          :disabled="busy"
          @refresh="load"
        />
        <ElAlert
          v-if="loadFailed"
          type="error"
          :title="t('ui.couldNotLoadTheListRefreshToTryAgain')"
          :closable="false"
          show-icon
        />
        <DataTable
          :loading="loading"
          :data="rows"
          stripe
          pagination
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          :pagination-disabled="loading || busy"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.user')" min-width="210">
            <template #default="{ row }">
              <div class="management-page__identity">
                <ElAvatar :size="36">{{ row.displayName.slice(0, 1) }}</ElAvatar>
                <div>
                  <strong>{{ row.displayName }}</strong
                  ><span>{{ row.username }}</span>
                </div>
              </div>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn
            prop="email"
            :label="t('ui.email')"
            min-width="220"
            show-overflow-tooltip
          />
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.roleLabel')" min-width="180">
            <template #default="{ row }">
              <ElTag v-if="row.isSuperAdmin" type="danger" effect="plain">{{
                t('ui.superAdministrator')
              }}</ElTag>
              <ElTag
                v-for="role in row.roles"
                :key="role.id"
                :type="role.status === 1 ? 'info' : 'warning'"
                effect="plain"
                style="margin: 2px"
                >{{ role.name }}{{ role.status === 0 ? t('ui.disabledSuffix') : '' }}</ElTag
              >
              <span v-if="!row.roles.length && !row.isSuperAdmin">{{
                t('ui.noRolesAssigned')
              }}</span>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn prop="departmentName" :label="t('ui.department')" min-width="130" />
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.status')" min-width="90">
            <template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'" effect="light">{{
                row.status === 1 ? t('ui.enabled') : t('ui.inactive')
              }}</ElTag></template
            >
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.createdAt')" min-width="210">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn v-if="canManage" :label="t('ui.actions')" width="160" fixed="right">
            <template #default="{ row }">
              <ElButton
                v-permission="'system:user:update'"
                link
                type="primary"
                :icon="EditPen"
                :disabled="busy || optionsLoading"
                @click="openForm(row)"
                >{{ t('ui.edit') }}</ElButton
              >
              <ElButton
                v-permission="'system:user:delete'"
                link
                type="danger"
                :icon="Delete"
                :loading="deletingId === row.id"
                :disabled="busy || row.isSuperAdmin || confirmingDelete"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              >
            </template>
          </ElTableColumn>
          <template #empty
            ><ElEmpty
              :description="
                loadFailed
                  ? t('ui.userListIsTemporarilyUnavailable')
                  : t('ui.noMatchingUsersAdjustTheFiltersOrAddAUser')
              "
              :image-size="72"
          /></template>
        </DataTable>
      </div>
    </template>
    <ElResult
      v-else
      icon="warning"
      :title="t('ui.accessUnavailable')"
      :sub-title="t('ui.contactAnAdministratorToRequestAccessToTheUserList')"
    />

    <UserFormDialog
      v-model="dialogVisible"
      :user="editingUser"
      :saving="saving"
      :roles="roleOptions"
      :departments="departments"
      @submit="submitForm"
    />
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/management.scss';
</style>
