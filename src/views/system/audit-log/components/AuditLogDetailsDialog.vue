<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AuditAction, AuditLogEntry } from '@/api/types/audit-log'
import { formatDate } from '@/locales'
import { activeTimeZone } from '@/utils/datetime'

defineProps<{ entry: AuditLogEntry }>()
const open = defineModel<boolean>({ required: true })
const { t } = useI18n({ useScope: 'global' })

const endpoints = {
  password_reset: { method: 'POST', paths: ['/system/users/:id/password'] },
  totp_enable: { method: 'POST', paths: ['/auth/totp/enable', '/system/users/:id/totp/setup'] },
  totp_disable: { method: 'POST', paths: ['/auth/totp/disable', '/system/users/:id/totp/disable'] },
  role_grant: { method: 'PUT', paths: ['/system/roles/:id/menus'] },
  session_revoke: { method: 'DELETE', paths: ['/system/users/:id/sessions/:sessionId'] }
} satisfies Record<AuditAction, { method: string; paths: string[] }>
</script>

<template>
  <ElDialog
    v-model="open"
    :title="t('auditLog.detailsTitle')"
    width="min(580px, calc(100vw - 32px))"
    align-center
  >
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem :label="t('auditLog.recordId')">{{ entry.id }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.createdAt')">
        {{ formatDate(entry.createdAt) }} · {{ activeTimeZone }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.actorId')">{{ entry.actorId }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.action')">
        {{ t(`auditLog.action_${entry.action}`) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.targetId')">
        {{ t(`auditLog.target_${entry.targetType}`) }} · {{ entry.targetId }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.httpMethod')">
        <code>{{ endpoints[entry.action]?.method ?? '—' }}</code>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.relatedEndpoints')">
        <div v-for="path in endpoints[entry.action]?.paths" :key="path">
          <code class="audit-details__path">{{ path }}</code>
        </div>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('auditLog.statusCode')">
        <ElTag :type="entry.result === 'success' ? 'success' : 'danger'">
          {{ entry.statusCode }} · {{ t(`auditLog.result_${entry.result}`) }}
        </ElTag>
      </ElDescriptionsItem>
    </ElDescriptions>
    <template #footer>
      <ElButton @click="open = false">{{ t('ui.close') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.audit-details__path {
  overflow-wrap: anywhere;
}
</style>
