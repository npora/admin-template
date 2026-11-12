<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type UploadProps,
  type UploadUserFile
} from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { Upload } from '@element-plus/icons-vue'
import { useLocale } from '@/composables/useLocale'
import { localeRegistry } from '@/locales/registry'
import { formatDate, formatNumber } from '@/locales'
import { localStorageService } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import { useUserStore } from '@/store/modules/user'
import { profileAccountKey } from '@/store/modules/profile'
import {
  createExampleForm,
  formCategories,
  priorities,
  ownersByCategory,
  formErrors,
  validAttachment,
  resolveFormDraft,
  type ExampleFormData
} from './model'
const { t } = useI18n({ useScope: 'global' })
const { locale } = useLocale()
const dateFormat = computed(() => localeRegistry[locale.value].dateFormats.date)
const account = useUserStore().userInfo
const draftKey = `${STORAGE_KEYS.FORM_DRAFT}:${account ? profileAccountKey(account) : 'anonymous'}`
const stored = resolveFormDraft(localStorageService.get(draftKey))
const form = reactive<ExampleFormData>(stored ?? createExampleForm())
const rangeDates = computed({
  get: () => form.dates,
  set: (value: unknown) => {
    form.dates = Array.isArray(value) ? value.map(String) : []
  }
})
const baseline = ref(JSON.stringify(form))
const dirty = computed(
  () =>
    JSON.stringify(form) !== baseline.value || (!submitted.value && attachments.value.length > 0)
)
const step = ref(0),
  submitted = ref(false),
  submitting = ref(false)
const attachments = ref<UploadUserFile[]>([])
const formRef = ref<FormInstance>()
const ownerOptions = computed(() => ownersByCategory[form.category])
const memberOptions = Object.values(ownersByCategory).flat()
const fields = [
  'name',
  'category',
  'owner',
  'description',
  'dates',
  'budget',
  'priority',
  'members',
  'email',
  'agreed'
] as const
const rules = computed<FormRules<ExampleFormData>>(() =>
  Object.fromEntries(
    fields.map((field) => [
      field,
      [
        {
          validator: (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
            const error = formErrors(form)[field]
            callback(error ? new Error(t(`form.${error}`)) : undefined)
          },
          trigger: ['blur', 'change']
        }
      ]
    ])
  )
)
watch(
  () => form.category,
  () => {
    if (!ownerOptions.value.includes(form.owner)) form.owner = ''
  }
)
watch(locale, () => formRef.value?.clearValidate())
watch(
  () => JSON.stringify(form),
  () => {
    submitted.value = false
  }
)
watch(attachments, () => {
  submitted.value = false
})
const stepFields: (keyof ExampleFormData)[][] = [
  ['name', 'category', 'owner', 'description'],
  ['dates', 'budget', 'priority', 'members', 'email', 'agreed']
]
async function next() {
  if (
    await formRef.value
      ?.validateField(stepFields[step.value] ?? [])
      .then(() => true)
      .catch(() => false)
  )
    step.value++
}
function saveDraft() {
  localStorageService.set(draftKey, {
    version: 1,
    data: { ...form, dates: [...form.dates], members: [...form.members] }
  })
  baseline.value = JSON.stringify(form)
  ElMessage.success(t('form.draftSaved'))
}
async function reset() {
  try {
    await ElMessageBox.confirm(t('form.resetConfirm'), t('ui.reset'), {
      type: 'warning',
      confirmButtonText: t('ui.reset'),
      cancelButtonText: t('ui.cancel')
    })
    Object.assign(form, createExampleForm())
    attachments.value = []
    step.value = 0
    submitted.value = false
    localStorageService.remove(draftKey)
    baseline.value = JSON.stringify(form)
    formRef.value?.clearValidate()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') throw error
  }
}
async function submit() {
  if (submitting.value) return
  if (
    !(await formRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false))
  ) {
    step.value = Object.keys(formErrors(form)).some((key) =>
      stepFields[0]?.includes(key as keyof ExampleFormData)
    )
      ? 0
      : 1
    return
  }
  submitting.value = true
  try {
    await Promise.resolve()
    submitted.value = true
    baseline.value = JSON.stringify(form)
    localStorageService.remove(draftKey)
    ElMessage.success(t('form.submitted'))
  } finally {
    submitting.value = false
  }
}
const changeFiles: UploadProps['onChange'] = (_file, list) => {
  const valid = list.filter(validAttachment)
  if (valid.length !== list.length) ElMessage.warning(t('form.attachmentRule'))
  attachments.value = valid.slice(0, 3)
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onActivated(() => window.addEventListener('beforeunload', beforeUnload))
onDeactivated(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(async (to) => {
  if (to.path === '/login') return true
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm(t('form.leaveConfirm'), t('form.unsaved'), {
      type: 'warning',
      confirmButtonText: t('form.leave'),
      cancelButtonText: t('form.stay')
    })
    return true
  } catch {
    return false
  }
})
</script>
<template>
  <section class="management-page form-example">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('table.eyebrow') }}</span>
        <h1>{{ t('form.title') }}</h1>
        <p>{{ t('form.description') }}</p>
      </div>
      <ElTag :type="dirty ? 'warning' : 'info'" effect="plain">{{
        dirty ? t('form.unsaved') : t('form.savedState')
      }}</ElTag>
    </header>
    <ElAlert
      :title="t('form.localNotice')"
      type="info"
      :closable="false"
      show-icon
      class="form-example__notice"
    />
    <div class="management-page__table-card">
      <ElSteps :active="step" finish-status="success" simple
        ><ElStep :title="t('form.basic')" /><ElStep :title="t('form.plan')" /><ElStep
          :title="t('form.review')"
      /></ElSteps>
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="form-example__body"
        @submit.prevent="step < 2 ? next() : submit()"
      >
        <div v-show="step === 0">
          <h2>{{ t('form.basic') }}</h2>
          <p>{{ t('form.basicHint') }}</p>
          <ElFormItem :label="t('form.name')" prop="name"
            ><ElInput v-model="form.name" maxlength="100" show-word-limit
          /></ElFormItem>
          <div class="dialog-field-grid">
            <ElFormItem :label="t('table.category')" prop="category"
              ><ElSelect v-model="form.category"
                ><ElOption
                  v-for="value in formCategories"
                  :key="value"
                  :value="value"
                  :label="t(`table.${value}`)" /></ElSelect></ElFormItem
            ><ElFormItem :label="t('form.owner')" prop="owner"
              ><ElSelect v-model="form.owner" :placeholder="t('form.ownerPlaceholder')"
                ><ElOption
                  v-for="value in ownerOptions"
                  :key="value"
                  :value="value"
                  :label="value" /></ElSelect
            ></ElFormItem>
          </div>
          <ElFormItem :label="t('ui.description')" prop="description"
            ><ElInput
              v-model="form.description"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
          /></ElFormItem>
        </div>
        <div v-show="step === 1">
          <h2>{{ t('form.plan') }}</h2>
          <p>{{ t('form.planHint') }}</p>
          <ElFormItem :label="t('form.dates')" prop="dates"
            ><ElDatePicker
              v-model="rangeDates"
              type="daterange"
              value-format="YYYY-MM-DD"
              :format="dateFormat"
              :start-placeholder="t('form.startDate')"
              :end-placeholder="t('form.endDate')"
              unlink-panels
          /></ElFormItem>
          <div class="dialog-field-grid">
            <ElFormItem :label="t('table.budget')" prop="budget"
              ><ElInputNumber
                v-model="form.budget"
                :min="0"
                :max="10000000"
                :precision="2" /></ElFormItem
            ><ElFormItem :label="t('form.priority')" prop="priority"
              ><ElSelect v-model="form.priority"
                ><ElOption
                  v-for="value in priorities"
                  :key="value"
                  :value="value"
                  :label="t(`form.${value}`)" /></ElSelect
            ></ElFormItem>
          </div>
          <ElFormItem :label="t('form.members')" prop="members"
            ><ElSelect v-model="form.members" multiple filterable :multiple-limit="5"
              ><ElOption
                v-for="value in memberOptions"
                :key="value"
                :value="value"
                :label="value" /></ElSelect
          ></ElFormItem>
          <ElFormItem :label="t('form.notifications')"
            ><ElSwitch v-model="form.notify"
          /></ElFormItem>
          <ElFormItem v-show="form.notify" :label="t('ui.email')" prop="email"
            ><ElInput v-model="form.email" maxlength="255"
          /></ElFormItem>
          <ElFormItem :label="t('form.attachments')"
            ><ElUpload
              v-model:file-list="attachments"
              :auto-upload="false"
              :limit="3"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              :on-change="changeFiles"
              :on-exceed="() => ElMessage.warning(t('form.attachmentRule'))"
              ><ElButton :icon="Upload">{{ t('form.chooseFiles') }}</ElButton
              ><template #tip
                ><div class="el-upload__tip">{{ t('form.attachmentHint') }}</div></template
              ></ElUpload
            ></ElFormItem
          >
          <ElFormItem prop="agreed"
            ><ElCheckbox v-model="form.agreed">{{ t('form.agreement') }}</ElCheckbox></ElFormItem
          >
        </div>
        <div v-show="step === 2">
          <h2>{{ t('form.review') }}</h2>
          <p>{{ t('form.reviewHint') }}</p>
          <ElDescriptions :column="1" border
            ><ElDescriptionsItem :label="t('form.name')">{{ form.name }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('table.category')">{{
              t(`table.${form.category}`)
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.owner')">{{ form.owner }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.dates')">{{
              form.dates.map((value) => formatDate(value, 'date')).join(' — ')
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('table.budget')">{{
              formatNumber(form.budget)
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.priority')">{{
              t(`form.${form.priority}`)
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.members')">{{
              form.members.join(', ') || '—'
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.notifications')">{{
              form.notify ? form.email : t('ui.disabled')
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('form.attachments')">{{
              attachments.map((file) => file.name).join(', ') || '—'
            }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('ui.description')">{{
              form.description || '—'
            }}</ElDescriptionsItem></ElDescriptions
          >
          <ElAlert
            v-if="submitted"
            :title="t('form.submitted')"
            type="success"
            show-icon
            :closable="false"
            class="form-example__notice"
          />
        </div>
        <div class="form-example__actions">
          <ElButton v-if="step > 0" @click="step--">{{ t('form.previous') }}</ElButton><ElButton
            v-if="step < 2"
            type="primary"
            native-type="submit"
            >{{ t('form.next') }}</ElButton
          ><ElButton v-else type="primary" native-type="submit" :loading="submitting">{{
            t('form.submit')
          }}</ElButton
          ><ElButton @click="saveDraft">{{ t('form.saveDraft') }}</ElButton
          ><ElButton @click="reset">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>
    </div>
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
.form-example {
  max-width: 1100px;
}
.form-example__notice {
  margin: 0 0 20px;
}
.form-example__body {
  max-width: 760px;
  margin: 28px auto 0;
  h2 {
    font-size: 18px;
    margin-bottom: 8px;
  }
  > div > p {
    font-size: 12px;
    line-height: 1.8;
    color: var(--np-text-secondary);
    margin-bottom: 24px;
  }
  :deep(.el-select),
  :deep(.el-date-editor),
  :deep(.el-input-number) {
    width: 100%;
  }
  :deep(.el-form-item__error) {
    position: static;
    flex-basis: 100%;
    line-height: 1.5;
  }
  :deep(.el-checkbox) {
    height: auto;
    white-space: normal;
  }
  :deep(.el-descriptions__content) {
    overflow-wrap: anywhere;
  }
}
.form-example__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border-top: 1px solid var(--np-border-color-light);
  padding-top: 22px;
  margin-top: 28px;
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
@media (max-width: 580px) {
  .form-example :deep(.el-steps--simple) {
    padding: 14px 8px;
  }
  .form-example :deep(.el-step.is-simple .el-step__title) {
    font-size: 11px;
  }
  .form-example :deep(.el-step.is-simple .el-step__arrow) {
    margin: 0 5px;
    min-width: 10px;
  }
}
</style>
