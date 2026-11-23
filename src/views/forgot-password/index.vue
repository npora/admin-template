<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft, Lock } from '@element-plus/icons-vue'
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
  newPassword: [
    { required: true, min: 6, max: 128, message: t('ui.passwordMustContain6128Characters') }
  ],
  confirmation: [
    {
      required: true,
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
      <section class="login-page__card recovery-page__card">
        <header class="login-page__header recovery-page__header">
          <ElIcon class="recovery-page__icon" aria-hidden="true"><Lock /></ElIcon>
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
              :placeholder="t('ui.passwordMustContain6128Characters')"
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
        <div class="recovery-page__help">
          <p>{{ t('ui.recoveryBindingRequired') }}</p>
          <p>
            {{
              authConfig.passwordResetContact
                ? t('ui.passwordResetContact', { contact: authConfig.passwordResetContact })
                : t('ui.passwordResetAdministrator')
            }}
          </p>
        </div>
        <RouterLink class="login-page__link recovery-page__return" :to="{ name: 'Login' }">
          <ElIcon aria-hidden="true"><ArrowLeft /></ElIcon>
          {{ t('ui.backToSignIn') }}
        </RouterLink>
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

.recovery-page__card {
  max-width: 460px;

  :deep(.el-input__wrapper) {
    min-height: 38px;
  }
}

.recovery-page__header {
  margin-bottom: 20px;
}

.recovery-page__icon {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 12px;
  font-size: 20px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.recovery-page__help {
  display: grid;
  gap: 4px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--np-fill-color-light);
  color: var(--np-text-regular);
  font-size: var(--np-font-size-small);
  line-height: 1.5;
  overflow-wrap: anywhere;

  p {
    margin: 0;
  }
}

.recovery-page__return {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
}
</style>
