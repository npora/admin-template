<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import DataTable from '@/components/DataTable/index.vue'
import { getOwnSessions, revokeOtherSessions, revokeOwnSession } from '@/api/modules/session'
import type { SessionEntry } from '@/api/types/session'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError, isNotFoundError } from '@/api/errors/handling'
import { formatDate } from '@/locales'
import { useUserStore } from '@/store/modules/user'

const { t } = useI18n({ useScope: 'global' })
const user = useUserStore()
const sessions = shallowRef<SessionEntry[]>([])
const loading = ref(false)
const confirming = ref(false)
const loadError = ref<'failed' | 'unavailable'>()
let controller: AbortController | undefined

const busy = computed(() => loading.value || confirming.value)
const canRevoke = computed(() => !busy.value && !loadError.value)
const hasOtherSessions = computed(() => sessions.value.some((session) => !session.current))

function reset() {
  controller?.abort()
  controller = undefined
  sessions.value = []
  loading.value = false
  confirming.value = false
  loadError.value = undefined
}

async function run(action: (signal: AbortSignal, isCurrent: () => boolean) => Promise<void>) {
  if (!user.userInfo || controller) return
  const request = new AbortController()
  const tokenVersion = getTokenVersion()
  controller = request
  const isCurrent = () => controller === request && tokenVersion === getTokenVersion()
  try {
    await action(request.signal, isCurrent)
  } catch (error) {
    if (isCurrent()) handleRequestError(error)
  } finally {
    if (controller === request) controller = undefined
  }
}

async function read(signal: AbortSignal, isCurrent: () => boolean) {
  loading.value = true
  loadError.value = undefined
  try {
    const result = await getOwnSessions(signal)
    if (isCurrent()) sessions.value = result
  } catch (error) {
    if (!isCurrent()) return
    const unavailable = isNotFoundError(error)
    loadError.value = unavailable ? 'unavailable' : 'failed'
    if (!unavailable) handleRequestError(error)
  } finally {
    if (controller?.signal === signal) loading.value = false
  }
}

function refresh() {
  return run(read)
}

function revoke(id?: string) {
  if (!canRevoke.value) return
  const otherSessions = sessions.value.filter((session) => !session.current)
  if (!otherSessions.some((session) => id === undefined || session.id === id)) return

  return run(async (signal, isCurrent) => {
    confirming.value = true
    try {
      await ElMessageBox.confirm(
        t(id === undefined ? 'profile.sessionsConfirmOthers' : 'profile.sessionsConfirmOne'),
        t(id === undefined ? 'profile.sessionsRevokeOthers' : 'profile.sessionsRevoke'),
        {
          type: 'warning',
          confirmButtonText: t(
            id === undefined ? 'profile.sessionsRevokeOthers' : 'profile.sessionsRevoke'
          ),
          cancelButtonText: t('ui.cancel')
        }
      )
      if (!isCurrent()) return
      const result =
        id === undefined ? await revokeOtherSessions(signal) : await revokeOwnSession(id, signal)
      if (!isCurrent()) return
      sessions.value = sessions.value.filter(
        (row) => row.current || (id !== undefined && row.id !== id)
      )
      ElMessage.success(t('profile.sessionsRevoked', result.revoked))
      await read(signal, isCurrent)
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') throw error
    } finally {
      if (controller?.signal === signal) confirming.value = false
    }
  })
}

watch(
  () => user.userInfo?.id,
  (accountId) => {
    reset()
    if (accountId !== undefined) void refresh()
  },
  { immediate: true, flush: 'sync' }
)
onScopeDispose(reset)
</script>

<template>
  <section class="profile-sessions" :aria-label="t('profile.sessions')">
    <div class="profile-sessions__actions">
      <ElButton :loading="loading" :disabled="confirming" @click="refresh">
        {{ t('ui.refresh') }}
      </ElButton>
      <ElButton type="danger" plain :disabled="!canRevoke || !hasOtherSessions" @click="revoke()">
        {{ t('profile.sessionsRevokeOthers') }}
      </ElButton>
    </div>
    <ElAlert
      v-if="loadError"
      :title="
        t(
          loadError === 'unavailable' ? 'profile.sessionsUnavailable' : 'profile.sessionsLoadFailed'
        )
      "
      :type="loadError === 'unavailable' ? 'info' : 'error'"
      :closable="false"
      show-icon
    />
    <DataTable
      :data="sessions"
      :loading="loading"
      :empty-text="loadError ? '—' : t('profile.sessionsEmpty')"
    >
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('profile.sessionsStatus')" min-width="110">
        <template #default="{ row }">
          <ElTag :type="row.current ? 'success' : 'info'" effect="plain">
            {{ t(row.current ? 'profile.sessionsCurrent' : 'profile.sessionsOther') }}
          </ElTag>
        </template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('profile.sessionsCreatedAt')" min-width="150">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('profile.sessionsExpiresAt')" min-width="150">
        <template #default="{ row }">{{ formatDate(row.expiresAt) }}</template>
      </ElTableColumn>
      <!-- @vue-generic {SessionEntry} -->
      <ElTableColumn :label="t('profile.sessionsActions')" min-width="100">
        <template #default="{ row }">
          <ElButton
            v-if="!row.current"
            link
            type="danger"
            :disabled="!canRevoke"
            @click="revoke(row.id)"
          >
            {{ t('profile.sessionsRevoke') }}
          </ElButton>
          <span v-else aria-hidden="true">—</span>
        </template>
      </ElTableColumn>
    </DataTable>
  </section>
</template>

<style scoped lang="scss">
.profile-sessions {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.profile-sessions__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
