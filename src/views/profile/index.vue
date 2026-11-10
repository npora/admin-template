<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useAppStore } from '@/store/modules/app'
import { useProfileStore } from '@/store/modules/profile'
import { useLocale } from '@/composables/useLocale'
import { formatNumber } from '@/locales'
import { createLocalProfile, profileErrors, type LocalProfile } from '@/store/modules/profile/model'
import type { ThemeMode, ComponentSize } from '@/store/modules/app/types'
const { t } = useI18n({ useScope: 'global' })
const user = useUserStore()
const app = useAppStore()
const profiles = useProfileStore()
const { enabled: localeEnabled, locale, localeOptions, setLocale } = useLocale()
const languageEnabled = computed(() => localeEnabled)
const { settings } = storeToRefs(app)
const { userInfo, displayName, avatar } = storeToRefs(user)
const form = ref(createLocalProfile())
const formRef = ref<FormInstance>()
const tab = ref('details')
const saving = ref(false)
const themeValues = ['light', 'dark', 'system'] as const
const sizeValues = ['large', 'default', 'small'] as const
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
function setTheme(value: unknown) {
  if (['light', 'dark', 'system'].includes(String(value))) app.setTheme(value as ThemeMode)
}
function setSize(value: unknown) {
  if (['small', 'default', 'large'].includes(String(value)))
    app.updateSettings({ componentSize: value as ComponentSize })
}
function setBreadcrumb(value: unknown) {
  app.updateSettings({ layout: { showBreadcrumb: Boolean(value) } })
}
function setTabs(value: unknown) {
  app.updateSettings({ layout: { showTabs: Boolean(value) } })
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
          }}</ElTag
          ><ElTag
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
                }}</ElButton
                ><ElButton :disabled="saving" @click="restore">{{ t('profile.discard') }}</ElButton
                ><ElButton text type="danger" :disabled="saving" @click="reset">{{
                  t('profile.resetLocal')
                }}</ElButton>
              </div>
            </ElForm> </ElTabPane
          ><ElTabPane :label="t('profile.preferences')" name="preferences">
            <div class="profile-preferences">
              <div>
                <h3>{{ t('ui.themeMode') }}</h3>
                <ElRadioGroup :model-value="settings.theme.mode" @change="setTheme"
                  ><ElRadioButton v-for="value in themeValues" :key="value" :value="value">{{
                    t(`ui.${value}`)
                  }}</ElRadioButton></ElRadioGroup
                >
              </div>
              <div v-if="languageEnabled">
                <h3>{{ t('language.current') }}</h3>
                <ElSelect
                  :model-value="locale"
                  :aria-label="t('language.current')"
                  @change="setLocale"
                  ><ElOption
                    v-for="option in localeOptions"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                /></ElSelect>
              </div>
              <div>
                <h3>{{ t('ui.componentSize') }}</h3>
                <ElRadioGroup :model-value="settings.componentSize" @change="setSize"
                  ><ElRadioButton v-for="value in sizeValues" :key="value" :value="value">{{
                    t(`ui.${value}`)
                  }}</ElRadioButton></ElRadioGroup
                >
              </div>
              <div class="profile-preferences__switch">
                <span>{{ t('ui.showBreadcrumbs') }}</span
                ><ElSwitch :model-value="settings.layout.showBreadcrumb" @change="setBreadcrumb" />
              </div>
              <div class="profile-preferences__switch">
                <span>{{ t('ui.showTabs') }}</span
                ><ElSwitch :model-value="settings.layout.showTabs" @change="setTabs" />
              </div>
            </div> </ElTabPane
        ></ElTabs>
      </div>
    </div>
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
.profile-grid {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.profile-summary {
  text-align: center;
  h2 {
    font-size: 20px;
    margin: 16px 0 6px;
    overflow-wrap: anywhere;
  }
  > p {
    font-size: 12px;
    color: var(--np-text-secondary);
    line-height: 1.8;
  }
  :deep(.el-avatar) {
    background: var(--np-primary-soft);
    color: var(--np-color-primary);
  }
  dl {
    margin: 25px 0 20px;
    text-align: left;
    border-top: 1px solid var(--np-border-color-light);
    > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
      padding-top: 15px;
    }
    dt {
      color: var(--np-text-secondary);
    }
    dd {
      overflow-wrap: anywhere;
      text-align: right;
    }
  }
}
.profile-summary__roles {
  :deep(.el-tag) {
    max-width: 100%;
  }
  :deep(.el-tag__content) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}
.profile-summary__note {
  font-size: 11px !important;
}
.profile-content {
  min-width: 0;
  :deep(.el-form-item__error) {
    position: static;
    flex-basis: 100%;
    line-height: 1.5;
  }
  :deep(.el-tabs__item) {
    font-size: 13px;
  }
}
.profile-notice {
  margin: 8px 0 24px;
}
.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
.profile-preferences {
  display: grid;
  gap: 28px;
  max-width: 460px;
  padding: 12px 0;
  h3 {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 12px;
  }
  :deep(.el-select) {
    width: 100%;
  }
  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}
.profile-preferences__switch {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  font-size: 13px;
}
@media (max-width: 1000px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .profile-summary {
    dl {
      max-width: 400px;
      margin-inline: auto;
    }
  }
}
</style>
