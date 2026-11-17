<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { useI18n } from 'vue-i18n'

import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Delete, EditPen, Plus, Search, ArrowDown, Key, Lock } from '@element-plus/icons-vue'
import { formatDate } from '@/locales'
import 'element-plus/es/components/message-box/style/css'

import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { handleRequestError } from '@/api/errors/handling'
import type { CreateUserInput, ManagedUser } from '@/api/types/user'
import { usePermission } from '@/composables/usePermission'
import { useUserManagement } from './useUserManagement'
import UserFormDialog from './components/UserFormDialog.vue'
import { resetUserPassword } from '@/api/modules/user'
import { useUserStore } from '@/store/modules/user'
import { useSession } from '@/composables/useSession'
import AuthenticatorSettings from '@/components/AuthenticatorSettings/index.vue'
import { authConfig } from '@/config/auth'
import { getTokenVersion } from '@/api/auth/token-storage'

const { t } = useI18n({ useScope: 'global' })

defineOptions({ name: 'SystemUser' })

const { hasPermission } = usePermission()
const currentUser = useUserStore()
const session = useSession()
const resettingPassword = ref(false)
let resetController: AbortController | undefined
let disposed = false
onBeforeUnmount(() => {
  disposed = true
  resetController?.abort()
})
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
const authenticatorUser = ref<ManagedUser | null>(null)
const authenticatorBusy = ref(false)
const dialogVisible = ref(false)
const editingUser = ref<ManagedUser | null>(null)
const confirmingDelete = ref(false)
const canManage = computed(
  () =>
    currentUser.userInfo?.isSuperAdmin ||
    hasPermission('system:user:update') ||
    hasPermission('system:user:delete')
)
const busy = computed(
  () => saving.value || deletingId.value !== undefined || resettingPassword.value
)

function canManageSecurity(user: ManagedUser) {
  return Boolean(
    currentUser.userInfo?.isSuperAdmin &&
    (!user.isSuperAdmin || user.id === currentUser.userInfo.id)
  )
}
function hasMoreActions(user: ManagedUser) {
  return canManageSecurity(user) || (!user.isSuperAdmin && hasPermission('system:user:delete'))
}
function moreAction(command: unknown, user: ManagedUser) {
  if (busy.value) return
  if (command === 'password' && canManageSecurity(user)) void resetPassword(user)
  if (
    command === 'authenticator' &&
    authConfig.authenticatorEnabled &&
    canManageSecurity(user) &&
    user.status === 1
  ) {
    authenticatorBusy.value = false
    authenticatorUser.value = user
  }
  if (command === 'delete') void confirmDelete(user)
}
function authenticatorChanged() {
  void load()
}

async function resetPassword(user: ManagedUser) {
  if (busy.value || !currentUser.userInfo?.isSuperAdmin) return
  resettingPassword.value = true
  const version = getTokenVersion()
  const active = () => !disposed && version === getTokenVersion()
  try {
    const current = await ElMessageBox.prompt(
      t('ui.administratorPasswordHint'),
      t('ui.resetPassword'),
      {
        inputType: 'password',
        inputValidator: (value) =>
          Boolean(value && value.length <= 128) || t('ui.enterYourPassword'),
        confirmButtonText: t('ui.gotIt'),
        cancelButtonText: t('ui.cancel')
      }
    )
    if (!active()) return
    const next = await ElMessageBox.prompt(
      t('ui.newPasswordHint', { account: user.username }),
      t('ui.resetPassword'),
      {
        inputType: 'password',
        inputValidator: (value) =>
          Boolean(value && value.length >= 12 && value.length <= 128) ||
          t('ui.passwordMustContain12128Characters'),
        confirmButtonText: t('ui.resetPassword'),
        cancelButtonText: t('ui.cancel')
      }
    )
    if (!active()) return
    resetController = new AbortController()
    await resetUserPassword(user.id, current.value, next.value, resetController.signal)
    if (!active()) return
    ElMessage.success(t('ui.passwordResetSuccess'))
    if (currentUser.userInfo?.id === user.id) await session.logout()
  } catch (error) {
    if (active() && error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    resettingPassword.value = false
  }
}

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
  <section class="management-page user-management-page">
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
          class="user-management-page__table"
          stripe
          :pagination="{ disabled: busy }"
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.user')" min-width="180">
            <template #default="{ row }">
              <div class="management-page__identity">
                <ElAvatar :size="36" :src="row.avatar || undefined">{{
                  row.displayName.slice(0, 1)
                }}</ElAvatar>
                <div>
                  <strong :title="row.displayName">{{ row.displayName }}</strong><span
                    :title="row.username"
                    >{{ row.username }}</span
                  >
                </div>
              </div>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.userContact')" min-width="160">
            <template #default="{ row }">
              <div class="user-management-page__contact">
                <span :title="row.email || ''">{{ row.email || '—' }}</span>
                <small v-if="row.mobile">{{ row.mobile }}</small>
              </div>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.roleLabel')" min-width="150">
            <template #default="{ row }">
              <div class="user-management-page__roles">
                <ElTag v-if="row.isSuperAdmin" type="danger" effect="plain">{{
                  t('ui.superAdministrator')
                }}</ElTag>
                <ElTag
                  v-for="role in row.roles"
                  :key="role.id"
                  :type="role.status === 1 ? 'info' : 'warning'"
                  effect="plain"
                  >{{ role.name }}{{ role.status === 0 ? t('ui.disabledSuffix') : '' }}</ElTag
                >
                <span v-if="!row.roles.length && !row.isSuperAdmin">{{
                  t('ui.noRolesAssigned')
                }}</span>
              </div>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn
            prop="departmentName"
            :label="t('ui.department')"
            min-width="110"
            show-overflow-tooltip
          />
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.status')" min-width="80">
            <template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'" effect="light">{{
                row.status === 1 ? t('ui.enabled') : t('ui.inactive')
              }}</ElTag></template
            >
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn
            v-if="authConfig.authenticatorEnabled"
            :label="t('ui.authenticator')"
            width="110"
          >
            <template #default="{ row }">
              <ElTag :type="row.authenticatorEnabled ? 'success' : 'info'" effect="plain">
                {{
                  row.authenticatorEnabled
                    ? t('ui.authenticatorBound')
                    : t('ui.authenticatorUnbound')
                }}
              </ElTag>
            </template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn :label="t('ui.createdAt')" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </ElTableColumn>
          <!-- @vue-generic {ManagedUser} -->
          <ElTableColumn v-if="canManage" :label="t('ui.actions')" width="140" fixed="right">
            <template #default="{ row }">
              <div class="user-management-page__actions">
                <ElButton
                  v-permission="'system:user:update'"
                  link
                  type="primary"
                  :icon="EditPen"
                  :disabled="busy || optionsLoading"
                  @click="openForm(row)"
                  >{{ t('ui.edit') }}</ElButton
                >
                <ElDropdown
                  v-if="hasMoreActions(row)"
                  trigger="click"
                  :disabled="busy"
                  @command="moreAction($event, row)"
                >
                  <ElButton
                    link
                    type="primary"
                    :disabled="busy"
                    :aria-label="t('ui.userMoreActions', { account: row.username })"
                  >
                    {{ t('ui.moreActions') }}<ElIcon><ArrowDown /></ElIcon>
                  </ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem
                        v-if="canManageSecurity(row)"
                        command="password"
                        :icon="Key"
                        >{{ t('ui.resetPassword') }}</ElDropdownItem
                      >
                      <ElDropdownItem
                        v-if="authConfig.authenticatorEnabled && canManageSecurity(row)"
                        command="authenticator"
                        :icon="Lock"
                        :disabled="row.status !== 1"
                        >{{ t('ui.manageAuthenticator') }}</ElDropdownItem
                      >
                      <ElDropdownItem
                        v-if="!row.isSuperAdmin && hasPermission('system:user:delete')"
                        command="delete"
                        :icon="Delete"
                        :disabled="confirmingDelete"
                        class="user-management-page__delete"
                        >{{ t('ui.delete') }}</ElDropdownItem
                      >
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
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

    <ElDialog
      v-if="authenticatorUser"
      :model-value="true"
      :title="t('ui.userAuthenticatorTitle', { account: authenticatorUser.username })"
      width="min(560px, calc(100vw - 32px))"
      :close-on-click-modal="false"
      :show-close="!authenticatorBusy"
      :close-on-press-escape="!authenticatorBusy"
      @close="authenticatorUser = null"
    >
      <AuthenticatorSettings
        :target-user="authenticatorUser"
        @changed="authenticatorChanged"
        @busy-change="authenticatorBusy = $event"
        @close="authenticatorUser = null"
      />
    </ElDialog>

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
@use './index.scss';
</style>
