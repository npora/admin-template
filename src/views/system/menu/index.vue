<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import { useI18n } from 'vue-i18n'

import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import type { ManagedMenu, MenuInput } from '@/api/types/menu'
import { MENU_TYPE_OPTIONS } from '@/constants/menu'
import { usePermission } from '@/composables/usePermission'
import { handleRequestError } from '@/api/errors/handling'
import { useMenuManagement } from './useMenuManagement'
import MenuFormDialog from './components/MenuFormDialog.vue'

const { t } = useI18n({ useScope: 'global' })

const { hasPermission } = usePermission()
const { rows, loading, failed, saving, deletingId, load, save, remove } = useMenuManagement()
const editing = ref<ManagedMenu | null>(null),
  visible = ref(false),
  confirming = ref(false)
const busy = computed(() => saving.value || deletingId.value !== undefined)
onMounted(() => {
  void load()
})
function open(menu: ManagedMenu | null = null) {
  if (busy.value || !hasPermission(menu ? 'system:menu:update' : 'system:menu:create')) return
  editing.value = menu ? { ...menu } : null
  visible.value = true
}
async function submit(input: MenuInput) {
  if (await save(input, editing.value?.id)) {
    visible.value = false
    ElMessage.success(t('ui.menuNodeSavedRefreshPermissionsToUpdateYourMenu'))
  }
}
async function confirmDelete(menu: ManagedMenu) {
  if (
    busy.value ||
    confirming.value ||
    menu.children?.length ||
    !hasPermission('system:menu:delete')
  )
    return
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      t('ui.deleteDeletedNodesNoLongerProvideRoutesOrPermissions', { value: menu.title }),
      t('ui.deleteNode'),
      { type: 'warning', confirmButtonText: t('ui.delete'), cancelButtonText: t('ui.cancel') }
    )
    if (await remove(menu.id)) ElMessage.success(t('ui.nodeDeleted'))
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
        <h1>{{ t('ui.menusAndButtonPermissions') }}</h1>
        <p>{{ t('ui.clearNavigationWithExplicitAccessForEveryAction') }}</p>
      </div>
      <ElButton
        v-permission="'system:menu:create'"
        type="primary"
        :disabled="busy"
        @click="open()"
        >{{ t('ui.addNode') }}</ElButton
      >
    </header>
    <template v-if="hasPermission('system:menu:list')">
      <ElAlert
        :title="t('ui.menuVisibilityHint')"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <div class="management-page__table-card">
        <div class="management-page__table-heading">
          <h2>{{ t('ui.nodeTree') }}</h2>
          <ElButton :loading="loading" :disabled="busy" @click="load">{{
            t('ui.refresh')
          }}</ElButton>
        </div>
        <ElAlert
          v-if="failed"
          :title="t('ui.couldNotLoadMenusRefreshToTryAgain')"
          type="error"
          :closable="false"
        />
        <DataTable
          :loading="loading"
          :data="rows"
          default-expand-all
          :tree-props="{ children: 'children' }"
        >
          <ElTableColumn prop="title" :label="t('ui.name')" min-width="200" />
          <!-- @vue-generic {ManagedMenu} -->
          <ElTableColumn :label="t('ui.type')" width="110"
            ><template #default="{ row }"
              ><ElTag :type="row.type === 3 ? 'info' : 'primary'">{{
                MENU_TYPE_OPTIONS.find((option) => option.value === row.type)?.label
              }}</ElTag></template
            ></ElTableColumn
          >
          <ElTableColumn prop="path" :label="t('ui.path')" min-width="140" /><ElTableColumn
            prop="component"
            :label="t('ui.component')"
            min-width="210"
            show-overflow-tooltip
          /><ElTableColumn
            prop="permission"
            :label="t('ui.permissionCode')"
            min-width="210"
            show-overflow-tooltip
          /><ElTableColumn prop="sortOrder" :label="t('ui.sortOrder')" width="80" />
          <!-- @vue-generic {ManagedMenu} -->
          <ElTableColumn :label="t('ui.status')" width="90"
            ><template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                row.status === 1 ? t('ui.enabled') : t('ui.disabled')
              }}</ElTag></template
            ></ElTableColumn
          >
          <!-- @vue-generic {ManagedMenu} -->
          <ElTableColumn :label="t('ui.actions')" width="150" fixed="right"
            ><template #default="{ row }"
              ><ElButton
                v-permission="'system:menu:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              ><ElButton
                v-permission="'system:menu:delete'"
                link
                type="danger"
                :loading="deletingId === row.id"
                :disabled="busy || !!row.children?.length || confirming"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              ></template
            ></ElTableColumn
          >
          <template #empty
            ><ElEmpty :description="t('ui.noMenuNodes')" :image-size="72"
          /></template>
        </DataTable>
      </div>
    </template>
    <ElResult v-else icon="warning" :title="t('ui.menuManagementIsNotAvailableToYourAccount')" />
    <MenuFormDialog
      v-model="visible"
      :menu="editing"
      :tree="rows"
      :saving="saving"
      @submit="submit"
    />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
</style>
