<script setup lang="ts">
import { onMounted, onScopeDispose, ref, useTemplateRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { getTokenVersion } from '@/api/auth/token-storage'
import { appConfig } from '@/config/app'
import { useSession } from '@/composables/useSession'
import { localIcons } from '@/icons/local'
import { formatDate } from '@/locales'
import { activeTimeZone } from '@/utils/datetime'
import {
  clearScreenLock,
  createScreenLock,
  readScreenLock,
  saveScreenLock,
  verifyScreenLock
} from '@/utils/screen-lock'

const { t } = useI18n({ useScope: 'global' })
const { logout } = useSession()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const password = ref('')
const error = ref('')
const busy = ref(false)
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
let disposed = false

function show() {
  const element = dialog.value
  if (!element || element.open) return
  now.value = Date.now()
  element.showModal()
  ticker = setInterval(() => (now.value = Date.now()), 1000)
}

async function lock() {
  if (busy.value || dialog.value?.open) return
  if (!globalThis.crypto?.subtle) {
    ElMessage.warning(t('ui.lockRequiresSecureContext'))
    return
  }

  busy.value = true
  const tokenVersion = getTokenVersion()
  try {
    const input = await ElMessageBox.prompt(t('ui.lockPasswordHint'), t('ui.lockScreen'), {
      inputType: 'password',
      closeOnClickModal: false,
      inputValidator: (value) =>
        (value.length >= 6 && value.length <= 128) || t('ui.lockPasswordLength')
    }).then(
      ({ value }) => value,
      () => undefined
    )
    if (input === undefined) return
    const record = await createScreenLock(input)
    if (disposed || tokenVersion !== getTokenVersion()) return
    saveScreenLock(record)
    show()
  } catch {
    ElMessage.error(t('ui.screenLockFailed'))
  } finally {
    busy.value = false
  }
}

function close() {
  clearInterval(ticker)
  ticker = undefined
  password.value = ''
  error.value = ''
  dialog.value?.close()
}

async function unlock() {
  if (busy.value || !password.value) return
  busy.value = true
  error.value = ''
  try {
    const record = readScreenLock()
    if (!record || !(await verifyScreenLock(record, password.value))) {
      error.value = t('ui.invalidLockPassword')
      return
    }
    if (disposed) return
    clearScreenLock()
    close()
  } catch {
    error.value = t('ui.screenLockFailed')
  } finally {
    password.value = ''
    busy.value = false
  }
}

async function relogin() {
  if (busy.value) return
  busy.value = true
  password.value = ''
  try {
    await logout()
  } catch {
    error.value = t('ui.screenLockFailed')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (readScreenLock()) show()
})
onScopeDispose(() => {
  disposed = true
  clearInterval(ticker)
})
defineExpose({ lock })
</script>

<template>
  <dialog
    ref="dialog"
    class="app-lock-screen"
    aria-labelledby="app-lock-screen-title"
    @cancel.prevent
  >
    <header class="app-lock-screen__brand">
      <ElIcon :size="20" class="app-lock-screen__icon">
        <component :is="localIcons['nova-screen-lock']" />
      </ElIcon>
      <span>{{ appConfig.title }}</span>
    </header>
    <section class="app-lock-screen__content">
      <h1 id="app-lock-screen-title">{{ t('ui.screenLocked') }}</h1>
      <time class="app-lock-screen__time" :datetime="new Date(now).toISOString()">
        {{ formatDate(now, 'time') }}
      </time>
      <p class="app-lock-screen__date">{{ formatDate(now, 'heading') }}</p>
      <p class="app-lock-screen__zone">{{ activeTimeZone }}</p>
      <form class="app-lock-screen__form" @submit.prevent="unlock">
        <ElInput
          v-model="password"
          type="password"
          autocomplete="off"
          :aria-label="t('ui.lockPassword')"
          :placeholder="t('ui.lockPassword')"
          :maxlength="128"
          :disabled="busy"
          autofocus
        />
        <p v-if="error" class="app-lock-screen__error" role="alert">{{ error }}</p>
        <div class="app-lock-screen__actions">
          <ElButton
            type="primary"
            size="large"
            native-type="submit"
            :loading="busy"
            :disabled="!password"
          >
            {{ t('ui.unlockScreen') }}
          </ElButton>
          <ElButton size="large" :disabled="busy" @click="relogin">
            {{ t('ui.signInAgain') }}
          </ElButton>
        </div>
      </form>
    </section>
  </dialog>
</template>

<style scoped lang="scss">
.app-lock-screen {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  border: 0;
  overflow: auto;
  flex-direction: column;
  align-items: center;

  padding: clamp(20px, 5vw, 44px);
  color: var(--np-text-primary);
  background:
    radial-gradient(ellipse at 50% 35%, var(--el-color-primary-light-8), transparent 65%),
    var(--np-bg-page);

  &[open] {
    display: flex;
  }

  &::backdrop {
    background: var(--np-bg-page);
  }
}

.app-lock-screen__brand {
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 10px;
  font-weight: 650;
}

.app-lock-screen__icon {
  color: var(--el-color-primary);
}

.app-lock-screen__content {
  display: grid;
  flex: 1;
  place-content: center;
  justify-items: center;
  gap: 12px;
  width: 100%;
  padding: 30px 0 50px;
  text-align: center;

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: 1rem;
    font-weight: 600;
  }
}

.app-lock-screen__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.app-lock-screen__form {
  display: grid;
  gap: 10px;
  width: min(360px, 100%);
  padding: 22px;
  margin-top: 10px;
  border: 1px solid var(--np-border-color-light);
  border-radius: 16px;
  background: var(--np-bg-container);
}

.app-lock-screen__error {
  color: var(--el-color-danger);
}

.app-lock-screen__time {
  font-size: clamp(2.35rem, 10vw, 6.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 550;
  line-height: 1.1;
  white-space: nowrap;
}

.app-lock-screen__date {
  color: var(--np-text-regular);
  font-size: 1.1rem;
}

.app-lock-screen__zone {
  color: var(--np-text-secondary);
  font-size: 0.85rem;
}
</style>
