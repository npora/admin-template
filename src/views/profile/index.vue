<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useProfileStore } from '@/store/modules/profile'
import { formatNumber } from '@/locales'
import { createLocalProfile, profileErrors, type LocalProfile } from '@/store/modules/profile/model'
import { authConfig } from '@/config/auth'
import AppPreferenceFields from '@/components/AppPreferenceFields/index.vue'
import AuthenticatorSettings from '@/components/AuthenticatorSettings/index.vue'
import ChangePasswordForm from './components/ChangePasswordForm.vue'
import SessionSettings from './components/SessionSettings.vue'
const { t, locale } = useI18n({ useScope: 'global' })
const authenticatorEnabled = computed(() => authConfig.authenticatorEnabled)
const user = useUserStore()
const profiles = useProfileStore()
const { userInfo, displayName, avatar } = storeToRefs(user)
const form = ref(createLocalProfile())
const formRef = ref<FormInstance>()
const tab = ref('details')
const saving = ref(false)
const permissionCount = computed(() =>
  user.userInfo?.permissions.includes('*')
    ? t('profile.allPermissions')
    : formatNumber(user.userInfo?.permissions.length ?? 0)
)
const rules = computed<FormRules<LocalProfile>>(() =>
  Object.fromEntries(
    (Object.keys(createLocalProfile()) as (keyof LocalProfile)[]).map((field) => [
      field,
      [
        {
          validator: (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
            const error = profileErrors(form.value)[field]
            callback(error ? new Error(t(`profile.${error}`)) : undefined)
          },
          trigger: 'blur'
        }
      ]
    ])
  )
)
function restore() {
  const account = user.userInfo
  const saved = account ? profiles.get(account) : undefined
  Object.assign(
    form.value,
    createLocalProfile(),
    saved ?? (account ? { displayName: account.displayName, avatar: account.avatar ?? '' } : {})
  )
  formRef.value?.clearValidate()
}
watch(() => user.userInfo, restore, { immediate: true })
watch(locale, () => formRef.value?.clearValidate())
async function save() {
  if (saving.value) return
  saving.value = true
  const account = user.userInfo
  try {
    if (
      !account ||
      !(await formRef.value
        ?.validate()
        .then(() => true)
        .catch(() => false)) ||
      user.userInfo !== account
    )
      return
    if (profiles.save(account, { ...form.value })) ElMessage.success(t('profile.saved'))
  } finally {
    saving.value = false
  }
}
async function reset() {
  const account = user.userInfo
  if (!account || saving.value) return
  try {
    await ElMessageBox.confirm(t('profile.resetConfirm'), t('profile.resetLocal'), {
      type: 'warning',
      confirmButtonText: t('profile.resetLocal'),
      cancelButtonText: t('ui.cancel')
    })
    if (user.userInfo !== account) return
    profiles.reset(account)
    restore()
    ElMessage.success(t('profile.restored'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') throw error
  }
}
</script>
<template>
  <section class="management-page profile-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('profile.eyebrow') }}</span>
        <h1>{{ t('profile.title') }}</h1>
        <p>{{ t('profile.description') }}</p>
      </div>
    </header>
    <div class="profile-grid">
      <aside class="management-page__table-card profile-summary">
        <ElAvatar :size="78" :src="avatar" :icon="UserFilled" />
        <h2>{{ displayName }}</h2>
        <p>{{ userInfo?.username }}</p>
        <div class="profile-summary__roles">
          <ElTag v-if="userInfo?.isSuperAdmin" type="primary" effect="plain">{{
            t('ui.superAdministrator')
          }}</ElTag><ElTag
            v-for="role in userInfo?.roles ?? []"
            :key="role"
            :title="role"
            type="info"
            effect="plain"
            >{{ role }}</ElTag
          >
        </div>
        <dl>
          <div>
            <dt>{{ t('profile.account') }}</dt>
            <dd>{{ userInfo?.username }}</dd>
          </div>
          <div>
            <dt>{{ t('profile.permissions') }}</dt>
            <dd>{{ permissionCount }}</dd>
          </div>
        </dl>
        <p class="profile-summary__note">{{ t('profile.accountReadOnly') }}</p>
      </aside>
      <div class="management-page__table-card profile-content">
        <ElTabs v-model="tab"
          ><ElTabPane :label="t('profile.details')" name="details">
            <ElAlert
              :title="t('profile.localNotice')"
              type="info"
              :closable="false"
              show-icon
              class="profile-notice"
            />
            <ElForm
              ref="formRef"
              :model="form"
              :rules="rules"
              label-position="top"
              @submit.prevent="save"
            >
              <ElFormItem :label="t('ui.displayName')" prop="displayName"
                ><ElInput v-model="form.displayName" maxlength="100"
              /></ElFormItem>
              <div class="dialog-field-grid">
                <ElFormItem :label="t('ui.email')" prop="email"
                  ><ElInput v-model="form.email" maxlength="255" /></ElFormItem
                ><ElFormItem :label="t('ui.mobile')" prop="mobile"
                  ><ElInput v-model="form.mobile" maxlength="32"
                /></ElFormItem>
              </div>
              <ElFormItem :label="t('ui.avatarURL')" prop="avatar"
                ><ElInput v-model="form.avatar" maxlength="500" placeholder="https://"
              /></ElFormItem>
              <ElFormItem :label="t('profile.bio')" prop="bio"
                ><ElInput
                  v-model="form.bio"
                  type="textarea"
                  :rows="4"
                  maxlength="400"
                  show-word-limit
              /></ElFormItem>
              <div class="profile-actions">
                <ElButton type="primary" native-type="submit" :loading="saving">{{
                  t('profile.saveLocal')
                }}</ElButton><ElButton :disabled="saving" @click="restore">{{
                  t('profile.discard')
                }}</ElButton
                ><ElButton text type="danger" :disabled="saving" @click="reset">{{
                  t('profile.resetLocal')
                }}</ElButton>
              </div>
            </ElForm> </ElTabPane
          ><ElTabPane :label="t('profile.preferences')" name="preferences">
            <AppPreferenceFields class="profile-preferences" show-reset />
          </ElTabPane>
          <ElTabPane :label="t('ui.changePassword')" name="password" lazy>
            <ChangePasswordForm :active="tab === 'password'" />
          </ElTabPane>
          <ElTabPane :label="t('profile.sessions')" name="sessions" lazy>
            <SessionSettings v-if="tab === 'sessions'" />
          </ElTabPane>
          <ElTabPane
            v-if="authenticatorEnabled"
            :label="t('ui.authenticator')"
            name="authenticator"
            lazy
          >
            <AuthenticatorSettings />
          </ElTabPane>
        </ElTabs>
      </div>
    </div>
  </section>
</template>
<style scoped lang="scss">
@use './index.scss';
</style>
