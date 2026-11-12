<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { nextTick, onScopeDispose, ref, watch } from 'vue'
import { ElMessage, type TreeInstance } from 'element-plus'
import type { ManagedRole } from '@/api/types/role'
import type { ManagedMenu } from '@/api/types/menu'
import { getRoleMenuOptions, getRoleMenus, grantRoleMenus } from '@/api/modules/role'
import { handleRequestError } from '@/api/errors/handling'
import { getTokenVersion } from '@/api/auth/token-storage'
import { usePermission } from '@/composables/usePermission'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{ modelValue: boolean; role: ManagedRole | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { hasPermission } = usePermission()
const treeRef = ref<TreeInstance>(),
  tree = ref<ManagedMenu[]>([])
const loading = ref(false),
  saving = ref(false),
  failed = ref(false),
  ready = ref(false)
let version = 0
let initialIds = ''
const checkedIds = () =>
  [...new Set(treeRef.value?.getCheckedKeys(false).map(Number) ?? [])].sort((a, b) => a - b)
onScopeDispose(() => {
  version++
})
async function load() {
  const id = props.role?.id,
    current = ++version,
    token = getTokenVersion()
  if (!id || !props.modelValue) return
  loading.value = true
  ready.value = false
  failed.value = false
  tree.value = []
  try {
    const [options, ids] = await Promise.all([getRoleMenuOptions(), getRoleMenus(id)])
    if (current !== version || token !== getTokenVersion() || !props.modelValue) return
    tree.value = options
    await nextTick()
    if (current !== version || token !== getTokenVersion() || !props.modelValue) return
    if (!treeRef.value) throw new Error(t('ui.permissionTreeIsNotReady'))
    treeRef.value.setCheckedKeys(ids)
    initialIds = JSON.stringify(checkedIds())
    ready.value = true
  } catch (error) {
    if (current === version && token === getTokenVersion() && props.modelValue) {
      failed.value = true
      handleRequestError(error)
    }
  } finally {
    if (current === version) loading.value = false
  }
}
watch(
  () => [props.modelValue, props.role?.id],
  () => {
    if (props.modelValue) void load()
    else {
      version++
      ready.value = false
    }
  }
)
function close() {
  if (!saving.value) emit('update:modelValue', false)
}
async function submit() {
  if (
    !ready.value ||
    saving.value ||
    !props.role ||
    !treeRef.value ||
    !hasPermission('system:role:grant')
  )
    return
  const ids = checkedIds()
  if (JSON.stringify(ids) === initialIds) {
    close()
    return
  }
  const current = version,
    token = getTokenVersion()
  saving.value = true
  try {
    await grantRoleMenus(props.role.id, ids)
    if (current !== version || token !== getTokenVersion()) return
    ElMessage.success(t('ui.permissionsSavedHint'))
    emit('update:modelValue', false)
  } catch (error) {
    if (current === version && token === getTokenVersion()) handleRequestError(error)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="t('ui.roleGrantTitle', { value: role?.name ?? '' })"
    width="min(640px, calc(100vw - 32px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    append-to-body
    @update:model-value="close"
  >
    <ElAlert
      :title="t('ui.grantTreeHint')"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <div v-loading="loading" style="min-height: 200px">
      <ElAlert
        v-if="failed"
        :title="t('ui.couldNotLoadPermissionsSavingIsDisabledUntilLoadingSucceeds')"
        type="error"
        :closable="false"
        ><ElButton @click="load">{{ t('ui.tryAgain') }}</ElButton></ElAlert
      >
      <ElTree
        ref="treeRef"
        :data="tree"
        :props="{ label: 'title', children: 'children' }"
        node-key="id"
        show-checkbox
        check-strictly
        default-expand-all
        :expand-on-click-node="false"
        :class="{ 'grant-saving': saving }"
      >
        <template #default="{ data }"
          ><span class="grant-node"
            >{{ data.title }}
            <small
              >{{
                data.type === 1
                  ? t('ui.directory')
                  : data.type === 2
                    ? t('ui.page')
                    : data.permission
              }}{{ data.status === 0 ? t('ui.disabledTreeSuffix') : '' }}</small
            ></span
          ></template
        >
      </ElTree>
    </div>
    <template #footer
      ><ElButton :disabled="saving" @click="close">{{ t('ui.cancel') }}</ElButton
      ><ElButton
        type="primary"
        :disabled="!ready || loading || failed"
        :loading="saving"
        @click="submit"
        >{{ t('ui.savePermissions') }}</ElButton
      ></template
    >
  </ElDialog>
</template>
<style scoped>
.grant-saving {
  pointer-events: none;
  opacity: 0.6;
}
:deep(.el-tree-node__content) {
  height: auto;
  min-height: 32px;
}
.grant-node {
  min-width: 0;
  padding-block: 5px;
  white-space: normal;
  overflow-wrap: anywhere;
}
small {
  color: var(--np-text-secondary);
  margin-left: 8px;
}
</style>
