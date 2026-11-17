<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  getAuthenticatorStatus,
  setupAuthenticator,
  enableAuthenticator,
  disableAuthenticator
} from '@/api/modules/auth'
import type { AuthenticatorStatus, AuthenticatorSetup } from '@/api/types/auth'
import { handleRequestError } from '@/api/errors/handling'
import { getTokenVersion } from '@/api/auth/token-storage'
import { useUserStore } from '@/store/modules/user'
import { useSession } from '@/composables/useSession'
const { t } = useI18n({ useScope: 'global' })
const user = useUserStore()
const session = useSession()
const status = ref<AuthenticatorStatus>()
const setup = ref<AuthenticatorSetup>()
const password = ref('')
const code = ref('')
const busy = ref(false)
const account = computed(() =>
  user.userInfo ? `${user.userInfo.id}:${user.userInfo.username}` : ''
)
let generation = 0
let controller: AbortController | undefined
function clear() {
  generation++
  controller?.abort()
  password.value = ''
  code.value = ''
  setup.value = undefined
  status.value = undefined
  busy.value = false
}
async function run<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  apply: (value: T) => void | Promise<void>
) {
  if (busy.value || !account.value) return
  const version = ++generation
  const tokenVersion = getTokenVersion()
  controller = new AbortController()
  busy.value = true
  try {
    const value = await operation(controller.signal)
    if (version !== generation || tokenVersion !== getTokenVersion()) return
    await apply(value)
  } catch (error) {
    if (version === generation && tokenVersion === getTokenVersion()) handleRequestError(error)
  } finally {
    if (version === generation) busy.value = false
  }
}
function load() {
  return run(getAuthenticatorStatus, (value) => {
    status.value = value
  })
}
function start() {
  if (!password.value) return
  return run(
    (signal) => setupAuthenticator(password.value, signal),
    (value) => {
      setup.value = value
      code.value = ''
    }
  )
}
function cancel() {
  setup.value = undefined
  password.value = ''
  code.value = ''
}
function submit() {
  if (!password.value || !/^\d{6}$/.test(code.value)) return
  return run(
    (signal) =>
      status.value?.enabled
        ? disableAuthenticator(password.value, code.value, signal)
        : enableAuthenticator(password.value, code.value, signal),
    async () => {
      cancel()
      ElMessage.success(t('ui.authenticatorChanged'))
      await session.logout()
    }
  )
}
watch(
  account,
  () => {
    clear()
    if (account.value) void load()
  },
  { immediate: true }
)
onBeforeUnmount(clear)
</script>

<template>
  <section class="authenticator-settings" v-loading="busy">
    <ElAlert :title="t('ui.authenticatorDescription')" type="info" :closable="false" show-icon />
    <template v-if="status">
      <ElTag :type="status.enabled ? 'success' : 'info'">{{
        status.enabled ? t('ui.authenticatorBound') : t('ui.authenticatorUnbound')
      }}</ElTag>
      <p v-if="!status.available && !status.enabled">{{ t('ui.authenticatorUnavailable') }}</p>
      <ElForm
        v-else
        label-position="top"
        :disabled="busy"
        @submit.prevent="setup || status.enabled ? submit() : start()"
      >
        <ElFormItem :label="t('ui.password')">
          <ElInput
            v-model="password"
            type="password"
            show-password
            autocomplete="current-password"
            :maxlength="128"
          />
        </ElFormItem>
        <template v-if="setup">
          <p>{{ t('ui.authenticatorSetupHint') }}</p>
          <ElFormItem :label="t('ui.authenticatorSecret')">
            <ElInput :model-value="setup.secret" readonly autocomplete="off" />
          </ElFormItem>
        </template>
        <ElFormItem v-if="setup || status.enabled" :label="t('ui.authenticatorCode')">
          <ElInput v-model="code" inputmode="numeric" :maxlength="6" autocomplete="one-time-code" />
        </ElFormItem>
        <div class="authenticator-settings__actions">
          <ElButton
            v-if="setup || status.enabled"
            native-type="submit"
            :type="status.enabled ? 'danger' : 'primary'"
            :disabled="!password || !/^\d{6}$/.test(code)"
          >
            {{ status.enabled ? t('ui.authenticatorDisable') : t('ui.authenticatorEnable') }}
          </ElButton>
          <ElButton v-else type="primary" native-type="submit" :disabled="!password">{{
            t('ui.authenticatorStart')
          }}</ElButton>
          <ElButton v-if="setup" @click="cancel">{{ t('ui.cancel') }}</ElButton>
        </div>
      </ElForm>
    </template>
    <ElButton v-else :disabled="busy" @click="load">{{ t('ui.refresh') }}</ElButton>
  </section>
</template>

<style scoped lang="scss">
@use './AuthenticatorSettings.scss';
</style>
