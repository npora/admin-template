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
import {
  getUserAuthenticatorStatus,
  setupUserAuthenticator,
  disableUserAuthenticator
} from '@/api/modules/user'
import type { AuthenticatorStatus, AuthenticatorSetup } from '@/api/types/auth'
import { handleRequestError } from '@/api/errors/handling'
import { getTokenVersion } from '@/api/auth/token-storage'
import { useUserStore } from '@/store/modules/user'
import { useSession } from '@/composables/useSession'
const props = defineProps<{ targetUser?: { id: number; username: string } }>()
const emit = defineEmits<{ changed: []; close: []; 'busy-change': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
const user = useUserStore()
const session = useSession()
const managedUser = computed(() =>
  props.targetUser && props.targetUser.id !== user.userInfo?.id ? props.targetUser : undefined
)
const immediatelyCreated = ref(false)
const status = ref<AuthenticatorStatus>()
const setup = ref<AuthenticatorSetup>()
const password = ref('')
const code = ref('')
const busy = ref(false)
watch(busy, (value) => emit('busy-change', value), { flush: 'sync' })
const account = computed(() =>
  user.userInfo
    ? `${user.userInfo.id}:${user.userInfo.username}:${props.targetUser?.id ?? ''}:${props.targetUser?.username ?? ''}`
    : ''
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
  immediatelyCreated.value = false
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
  return run(
    (signal) =>
      managedUser.value
        ? getUserAuthenticatorStatus(managedUser.value.id, signal)
        : getAuthenticatorStatus(signal),
    (value) => {
      status.value = value
    }
  )
}
function start() {
  if (!password.value) return
  return run(
    (signal) =>
      managedUser.value
        ? setupUserAuthenticator(managedUser.value.id, password.value, signal)
        : setupAuthenticator(password.value, signal),
    (value) => {
      setup.value = value
      code.value = ''
      if (managedUser.value) {
        status.value = { available: true, enabled: true }
        immediatelyCreated.value = true
        password.value = ''
        ElMessage.success(t('ui.userAuthenticatorCreated'))
        emit('changed')
      }
    }
  )
}
function cancel() {
  setup.value = undefined
  immediatelyCreated.value = false
  password.value = ''
  code.value = ''
}
function submit() {
  if (immediatelyCreated.value || !password.value || !/^\d{6}$/.test(code.value)) return
  return run(
    (signal) => {
      const id = managedUser.value?.id
      if (id !== undefined) return disableUserAuthenticator(id, password.value, code.value, signal)
      return status.value?.enabled
        ? disableAuthenticator(password.value, code.value, signal)
        : enableAuthenticator(password.value, code.value, signal)
    },
    async () => {
      cancel()
      if (!props.targetUser || props.targetUser.id === user.userInfo?.id) {
        ElMessage.success(t('ui.authenticatorChanged'))
        await session.logout()
      } else {
        ElMessage.success(t('ui.userAuthenticatorChanged'))
        emit('changed')
      }
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
    <ElAlert
      :title="
        managedUser
          ? t('ui.userAuthenticatorDescription', { account: managedUser.username })
          : t('ui.authenticatorDescription')
      "
      type="info"
      :closable="false"
      show-icon
    />
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
        <ElFormItem
          v-if="!immediatelyCreated"
          :label="managedUser ? t('ui.administratorPassword') : t('ui.password')"
        >
          <ElInput
            v-model="password"
            type="password"
            show-password
            autocomplete="current-password"
            :maxlength="128"
          />
        </ElFormItem>
        <template v-if="setup">
          <p>
            {{
              managedUser
                ? t('ui.userAuthenticatorSetupHint', { account: managedUser.username })
                : t('ui.authenticatorSetupHint')
            }}
          </p>
          <ElFormItem :label="t('ui.authenticatorSecret')">
            <ElInput :model-value="setup.secret" readonly autocomplete="off" />
          </ElFormItem>
        </template>
        <ElFormItem
          v-if="!immediatelyCreated && (setup || status.enabled)"
          :label="t('ui.authenticatorCode')"
        >
          <ElInput v-model="code" inputmode="numeric" :maxlength="6" autocomplete="one-time-code" />
        </ElFormItem>
        <div v-if="immediatelyCreated" class="authenticator-settings__actions">
          <ElButton type="primary" @click="emit('close')">{{
            t('ui.authenticatorSaved')
          }}</ElButton>
        </div>
        <div v-else class="authenticator-settings__actions">
          <ElButton
            v-if="setup || status.enabled"
            native-type="submit"
            :type="status.enabled ? 'danger' : 'primary'"
            :disabled="!password || !/^\d{6}$/.test(code)"
          >
            {{ status.enabled ? t('ui.authenticatorDisable') : t('ui.authenticatorEnable') }}
          </ElButton>
          <ElButton v-else type="primary" native-type="submit" :disabled="!password">{{
            managedUser ? t('ui.createAndActivateAuthenticator') : t('ui.authenticatorStart')
          }}</ElButton>
          <ElButton v-if="setup" @click="cancel">{{ t('ui.cancel') }}</ElButton>
        </div>
      </ElForm>
    </template>
    <ElButton v-else :disabled="busy" @click="load">{{ t('ui.refresh') }}</ElButton>
  </section>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
