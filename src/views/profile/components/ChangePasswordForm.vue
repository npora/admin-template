<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { changePassword, getAuthenticatorStatus } from '@/api/modules/auth'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { useSession } from '@/composables/useSession'
import { useUserStore } from '@/store/modules/user'

const props = defineProps<{ active: boolean }>()
const { t } = useI18n({ useScope: 'global' })
const user = useUserStore()
const session = useSession()
const formRef = ref<FormInstance>()
const form = reactive({ currentPassword: '', totpCode: '', newPassword: '', confirmation: '' })
const requiresTotp = ref<boolean>()
const busy = ref(false)
let controller: AbortController | undefined

const rules = computed<FormRules<typeof form>>(() => ({
  currentPassword: [{ required: true, message: t('ui.enterYourPassword') }],
  totpCode: requiresTotp.value
    ? [{ required: true, pattern: /^\d{6}$/, message: t('ui.enterAuthenticatorCode') }]
    : [],
  newPassword: [{ required: true, min: 12, max: 128, message: t('ui.passwordLengthPlaceholder') }],
  confirmation: [
    {
      validator: (_rule, value: string) => value === form.newPassword,
      message: t('ui.passwordMismatch')
    }
  ]
}))

function clear() {
  controller?.abort()
  controller = undefined
  form.currentPassword = form.totpCode = form.newPassword = form.confirmation = ''
  requiresTotp.value = undefined
  busy.value = false
  formRef.value?.clearValidate()
}

async function run(action: (signal: AbortSignal, isCurrent: () => boolean) => Promise<void>) {
  if (!props.active || !user.userInfo || busy.value) return
  const request = new AbortController()
  const tokenVersion = getTokenVersion()
  const isCurrent = () => controller === request && getTokenVersion() === tokenVersion
  controller = request
  busy.value = true
  try {
    await action(request.signal, isCurrent)
  } catch (error) {
    if (isCurrent()) handleRequestError(error)
  } finally {
    if (controller === request) {
      controller = undefined
      busy.value = false
    }
  }
}

function loadStatus() {
  return run(async (signal, isCurrent) => {
    const status = await getAuthenticatorStatus(signal)
    if (isCurrent()) requiresTotp.value = status.enabled
  })
}

function submit() {
  if (requiresTotp.value === undefined) return
  return run(async (signal, isCurrent) => {
    if (!(await formRef.value?.validate().catch(() => false)) || !isCurrent()) return
    await changePassword(
      {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        ...(requiresTotp.value ? { totpCode: form.totpCode } : {})
      },
      signal
    )
    if (!isCurrent()) return
    clear()
    ElMessage.success(t('ui.passwordUpdated'))
    await session.logout()
  })
}

watch(
  [() => props.active, () => user.userInfo?.id],
  () => {
    clear()
    if (props.active && user.userInfo) void loadStatus()
  },
  { immediate: true, flush: 'sync' }
)
onScopeDispose(clear)
</script>

<template>
  <section class="profile-password" v-loading="busy">
    <p class="profile-password__hint">{{ t('ui.changePasswordDescription') }}</p>
    <ElButton v-if="requiresTotp === undefined && !busy" @click="loadStatus">
      {{ t('ui.tryAgain') }}
    </ElButton>
    <ElForm
      v-if="requiresTotp !== undefined"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="busy"
      @submit.prevent="submit"
    >
      <ElFormItem prop="currentPassword" :label="t('ui.currentPasswordLabel')">
        <ElInput
          v-model="form.currentPassword"
          type="password"
          autocomplete="current-password"
          :maxlength="128"
          show-password
        />
      </ElFormItem>
      <ElFormItem v-if="requiresTotp" prop="totpCode" :label="t('ui.authenticatorCode')">
        <ElInput
          v-model.trim="form.totpCode"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="6"
        />
      </ElFormItem>
      <ElFormItem prop="newPassword" :label="t('ui.newPasswordLabel')">
        <ElInput
          v-model="form.newPassword"
          type="password"
          autocomplete="new-password"
          :maxlength="128"
          show-password
        />
      </ElFormItem>
      <ElFormItem prop="confirmation" :label="t('ui.confirmNewPassword')">
        <ElInput
          v-model="form.confirmation"
          type="password"
          autocomplete="new-password"
          :maxlength="128"
          show-password
        />
      </ElFormItem>
      <ElButton native-type="submit" type="primary" :loading="busy">{{
        t('ui.changePassword')
      }}</ElButton>
    </ElForm>
  </section>
</template>

<style scoped lang="scss">
.profile-password {
  max-width: 26rem;
}

.profile-password__hint {
  color: var(--np-text-secondary);
  margin-bottom: 16px;
}
</style>
