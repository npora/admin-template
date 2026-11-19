<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPermissionPreview } from '@/api/modules/permission-preview'
import type { PermissionPreviewEntry } from '@/api/types/permission-preview'
import type { ManagedUser } from '@/api/types/user'
import DataTable from '@/components/DataTable/index.vue'
import { usePermission } from '@/composables/usePermission'
import { useUserDialogData } from '../useUserDialogData'

interface PermissionRow extends PermissionPreviewEntry {
  children: PermissionRow[]
}

const props = defineProps<{ user: ManagedUser }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n({ useScope: 'global' })
const { hasPermission } = usePermission()
const { data, failed, loading, reload } = useUserDialogData(
  () => (hasPermission('system:user:permission-preview') ? props.user.id : undefined),
  getPermissionPreview
)
const roleNames = computed(() => new Map(data.value?.roles.map((role) => [role.id, role.name])))
const rows = computed(() => {
  const nodes = new Map<number, PermissionRow>(
    data.value?.entries.map((entry) => [entry.id, { ...entry, children: [] }])
  )
  const roots: PermissionRow[] = []
  for (const row of nodes.values()) {
    const parent = row.parentId === null ? undefined : nodes.get(row.parentId)
    if (parent) parent.children.push(row)
    else roots.push(row)
  }
  return roots
})

const typeLabels = {
  directory: 'ui.directory',
  menu: 'ui.page',
  permission: 'ui.button'
} as const
const sourceLabels = {
  role: 'ui.permissionSourceRole',
  inherited: 'ui.permissionSourceInherited',
  superAdmin: 'ui.superAdministrator'
} as const
</script>

<template>
  <ElDialog
    :model-value="true"
    :title="t('ui.userPermissionPreviewTitle', { account: user.displayName })"
    width="min(760px, calc(100vw - 32px))"
    align-center
    append-to-body
    @close="emit('close')"
  >
    <ElAlert
      v-if="failed"
      :title="t('ui.userPermissionPreviewUnavailable')"
      type="error"
      :closable="false"
      show-icon
    />
    <DataTable
      v-if="loading || data"
      :data="rows"
      :loading="loading"
      max-height="min(480px, 54vh)"
      default-expand-all
      :empty-text="t('ui.userPermissionPreviewEmpty')"
    >
      <!-- @vue-generic {PermissionRow} -->
      <ElTableColumn :label="t('ui.name')" min-width="170">
        <template #default="{ row }">{{ row.title }}</template>
      </ElTableColumn>
      <!-- @vue-generic {PermissionRow} -->
      <ElTableColumn :label="t('ui.type')" width="92">
        <template #default="{ row }">{{ t(typeLabels[row.type]) }}</template>
      </ElTableColumn>
      <ElTableColumn
        prop="permission"
        :label="t('ui.permissionCode')"
        min-width="155"
        show-overflow-tooltip
      />
      <!-- @vue-generic {PermissionRow} -->
      <ElTableColumn :label="t('ui.permissionSource')" min-width="170">
        <template #default="{ row }">
          <ElTag
            v-if="row.source !== 'role'"
            type="info"
            effect="plain"
            class="user-permission-preview__source"
            >{{ t(sourceLabels[row.source]) }}</ElTag
          >
          <ElTag
            v-for="roleId in row.roleIds"
            :key="roleId"
            effect="plain"
            class="user-permission-preview__source"
            >{{ roleNames.get(roleId) }}</ElTag
          >
        </template>
      </ElTableColumn>
    </DataTable>
    <template #footer>
      <ElButton v-if="failed" :disabled="loading" @click="reload">{{ t('ui.tryAgain') }}</ElButton>
      <ElButton @click="emit('close')">{{ t('ui.close') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.user-permission-preview__source {
  margin: 2px 4px 2px 0;
}
</style>
