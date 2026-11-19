<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { getUserSessions, revokeUserSession } from '@/api/modules/session'
import type { SessionEntry } from '@/api/types/session'
import type { ManagedUser } from '@/api/types/user'
import DataTable from '@/components/DataTable/index.vue'
import { usePermission } from '@/composables/usePermission'
import { useUserStore } from '@/store/modules/user'
import { formatDate } from '@/locales'
import 'element-plus/es/components/message-box/style/css'
import { useUserDialogData } from '../useUserDialogData'

const props = defineProps<{ user: ManagedUser }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n({ useScope: 'global' })
const { hasPermission } = usePermission()
const actor = useUserStore()
const actorId = actor.userInfo?.id
const permittedTarget = () =>
  hasPermission('system:user-session:list') &&
  (!props.user.isSuperAdmin || props.user.id === actorId)
    ? props.user.id
    : undefined
const canRevoke = () =>
  permittedTarget() !== undefined && hasPermission('system:user-session:revoke')
const { data, failed, loading, reload } = useUserDialogData(permittedTarget, getUserSessions)
const revokingId = ref<string>()
let activeRevoke: AbortController | undefined
watch([permittedTarget, () => actor.userInfo?.id, canRevoke], () => activeRevoke?.abort(), {
  flush: 'sync'
})
onScopeDispose(() => activeRevoke?.abort())

async function revoke(session: SessionEntry) {
  const userId = permittedTarget()
  if (
    userId === undefined ||
    session.current ||
    revokingId.value ||
    loading.value ||
    failed.value ||
    !canRevoke()
  )
    return

  const controller = new AbortController()
  const tokenVersion = getTokenVersion()
  const isCurrent = () =>
    !controller.signal.aborted &&
    tokenVersion === getTokenVersion() &&
    actorId === actor.userInfo?.id &&
    permittedTarget() === userId &&
    canRevoke()
  activeRevoke = controller
  revokingId.value = session.id
  try {
    await ElMessageBox.confirm(t('ui.userSessionRevokeDescription'), t('ui.userSessionRevoke'), {
      type: 'warning',
      confirmButtonText: t('ui.userSessionRevoke'),
      cancelButtonText: t('ui.cancel')
    })
    if (!isCurrent()) return
    await revokeUserSession(userId, session.id, controller.signal)
    if (!isCurrent()) return
    ElMessage.success(t('ui.userSessionRevoked'))
    await reload()
  } catch (error) {
    if (isCurrent() && error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    if (activeRevoke === controller) {
      activeRevoke = undefined
      revokingId.value = undefined
    }
  }
}
</script>

<template>
  <ElDialog
    :model-value="true"
    :title="t('ui.userSessionsTitle', { account: user.displayName })"
    width="min(680px, calc(100vw - 32px))"
    align-center
    append-to-body
    @close="emit('close')"
  >
    <ElAlert
      v-if="failed"
      :title="t('ui.userSessionsUnavailable')"
      type="error"
      :closable="false"
      show-icon
    />
    <DataTable
      v-if="loading || data"
      :data="data ?? []"
      :loading="loading"
      max-height="min(480px, 54vh)"
      :empty-text="t('ui.userSessionsEmpty')"
    >
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('ui.userSessionCreatedAt')" min-width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('ui.userSessionExpiresAt')" min-width="160">
        <template #default="{ row }">{{ formatDate(row.expiresAt) }}</template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('ui.status')" min-width="125">
        <template #default="{ row }">
          <ElTag :type="row.current ? 'success' : 'info'" effect="plain">{{
            t(row.current ? 'ui.userSessionCurrent' : 'ui.userSessionActive')
          }}</ElTag>
        </template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn v-if="canRevoke()" :label="t('ui.actions')" width="110">
        <template #default="{ row }">
          <ElButton
            v-if="!row.current"
            type="danger"
            link
            :disabled="revokingId !== undefined || loading || failed"
            :loading="revokingId === row.id"
            @click="revoke(row)"
            >{{ t('ui.userSessionRevoke') }}</ElButton
          >
        </template>
      </ElTableColumn>
    </DataTable>
    <template #footer>
      <ElButton :disabled="loading || revokingId !== undefined" @click="reload">{{
        t(failed ? 'ui.tryAgain' : 'ui.refresh')
      }}</ElButton>
      <ElButton @click="emit('close')">{{ t('ui.close') }}</ElButton>
    </template>
  </ElDialog>
</template>
