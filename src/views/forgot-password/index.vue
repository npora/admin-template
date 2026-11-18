<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import LocaleSwitch from '@/components/LocaleSwitch/index.vue'
import { resetPassword } from '@/api/modules/auth'
import { getTokenVersion } from '@/api/auth/token-storage'
import { getRequestErrorMessage } from '@/api/errors/handling'
import { translateErrorMessage } from '@/locales/errors'
import { authConfig } from '@/config/auth'
import { useSession } from '@/composables/useSession'

const { t } = useI18n({ useScope: 'global' })
const session = useSession()
const formRef = ref<FormInstance>()
const form = reactive({ username: '', totpCode: '', newPassword: '', confirmation: '' })
const submitting = ref(false)
const errorMessage = ref('')
let controller: AbortController | undefined

const rules = computed<FormRules<typeof form>>(() => ({
  username: [{ required: true, message: t('ui.enterYourUsername') }],
  totpCode: [{ required: true, pattern: /^\d{6}$/, message: t('ui.enterAuthenticatorCode') }],
  newPassword: [{ required: true, min: 12, max: 128, message: t('ui.passwordLengthPlaceholder') }],
  confirmation: [
    {
      validator: (_rule, value: string) => value === form.newPassword,
      message: t('ui.passwordMismatch')
    }
  ]
}))

onScopeDispose(() => controller?.abort())

async function submit() {
  if (submitting.value || !formRef.value) return
  const request = new AbortController()
  controller = request
  const tokenVersion = getTokenVersion()
  const current = () => !request.signal.aborted && getTokenVersion() === tokenVersion
  submitting.value = true
  errorMessage.value = ''
  try {
    if (!(await formRef.value.validate().catch(() => false)) || !current()) return
    await resetPassword(
      {
        username: form.username.trim(),
        totpCode: form.totpCode,
        newPassword: form.newPassword
      },
      request.signal
    )
    if (!current()) return
    form.totpCode = form.newPassword = form.confirmation = ''
    ElMessage.success(t('ui.passwordUpdated'))
    await session.logout()
  } catch (error) {
    if (current()) errorMessage.value = getRequestErrorMessage(error)
  } finally {
    submitting.value = false
    controller = undefined
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__language"><LocaleSwitch /></div>
    <div class="login-page__decor login-page__decor--one" />
    <div class="login-page__decor login-page__decor--two" />
    <main class="login-page__content recovery-page__content">
      <section class="login-page__card">
        <header class="login-page__header">
          <h1 class="login-page__title">{{ t('ui.recoverPassword') }}</h1>
          <p class="login-page__subtitle">{{ t('ui.recoverPasswordDescription') }}</p>
        </header>
        <ElForm
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          :disabled="submitting"
          @submit.prevent="submit"
        >
          <ElFormItem prop="username" :label="t('ui.username')">
            <ElInput v-model.trim="form.username" autocomplete="username" :maxlength="64" />
          </ElFormItem>
          <ElFormItem prop="totpCode" :label="t('ui.authenticatorCode')">
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
          <p v-if="errorMessage" class="recovery-page__error" role="alert">
            {{ translateErrorMessage(errorMessage) }}
          </p>
          <ElButton
            class="login-page__submit"
            native-type="submit"
            type="primary"
            :loading="submitting"
            >{{ t('ui.resetPassword') }}</ElButton
          >
        </ElForm>
        <p class="login-page__subtitle">{{ t('ui.recoveryBindingRequired') }}</p>
        <p class="login-page__subtitle">
          {{
            authConfig.passwordResetContact
              ? t('ui.passwordResetContact', { contact: authConfig.passwordResetContact })
              : t('ui.passwordResetAdministrator')
          }}
        </p>
        <RouterLink class="login-page__link recovery-page__return" :to="{ name: 'Login' }">{{
          t('ui.backToSignIn')
        }}</RouterLink>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '../login/index.scss';

.recovery-page__content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
}

.recovery-page__error {
  color: var(--el-color-danger);
}

.recovery-page__return {
  margin-top: 16px;
}
</style>
