<script setup lang="ts">
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useI18n } from 'vue-i18n'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { CreateUserInput, ManagedUser } from '@/api/types/user'
import type { RoleOption } from '@/api/types/role'
import type { DepartmentOption } from '@/api/types/department'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { usePermission } from '@/composables/usePermission'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  modelValue: boolean
  user: ManagedUser | null
  saving: boolean
  roles: RoleOption[]
  departments: DepartmentOption[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: CreateUserInput]
}>()
const { hasPermission } = usePermission()
const formRef = ref<FormInstance>()
const editing = computed(() => props.user !== null)
const defaults = (): CreateUserInput => ({
  username: '',
  password: '',
  departmentId: null,
  displayName: '',
  avatar: null,
  email: null,
  mobile: null,
  status: 1,
  roleIds: []
})
function mapDepartments(
  items: DepartmentOption[]
): Array<DepartmentOption & { disabled: boolean }> {
  return items.map((item) => ({
    ...item,
    disabled: item.status === 0,
    children: mapDepartments(item.children ?? [])
  }))
}
const departmentOptions = computed(() => mapDepartments(props.departments))
const form = reactive<CreateUserInput>(defaults())
const rules = computed<FormRules<CreateUserInput>>(() => ({
  username: [
    { required: true, message: t('ui.enterYourUsername'), trigger: 'blur' },
    {
      pattern: /^[A-Za-z][A-Za-z0-9_]{2,63}$/,
      message: t('ui.usernameFormatHint'),
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: t('ui.enterAnInitialPassword'), trigger: 'blur' },
    { min: 12, max: 128, message: t('ui.passwordMustContain12128Characters'), trigger: 'blur' }
  ],
  displayName: [
    { required: true, whitespace: true, message: t('ui.enterADisplayName'), trigger: 'blur' },
    { max: 100, message: t('ui.nameMustNotExceed100Characters'), trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: t('ui.enterAValidEmail'), trigger: 'blur' },
    { max: 255, message: t('ui.emailMustNotExceed255Characters'), trigger: 'blur' }
  ],
  mobile: [{ max: 32, message: t('ui.mobileNumberMustNotExceed32Characters'), trigger: 'blur' }]
}))
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) {
      form.password = ''
      return
    }
    const user = props.user
    Object.assign(
      form,
      user
        ? {
            username: user.username,
            password: '',
            departmentId: user.departmentId,
            displayName: user.displayName,
            avatar: user.avatar,
            email: user.email,
            mobile: user.mobile,
            status: user.status,
            roleIds: [...user.roleIds]
          }
        : defaults()
    )
    submission.reset(toInput())
    await nextTick()
    formRef.value?.clearValidate()
  }
)
function close() {
  if (!props.saving) emit('update:modelValue', false)
}
function toInput(): CreateUserInput {
  return {
    ...form,
    departmentId: form.departmentId ?? null,
    displayName: form.displayName.trim(),
    email: form.email?.trim() || null,
    mobile: form.mobile?.trim() || null,
    avatar: form.avatar?.trim() || null,
    roleIds: [...form.roleIds].sort((a, b) => a - b)
  }
}
const submission = useFormSubmit<CreateUserInput>({
  active: () => props.modelValue,
  editing: () => props.user !== null,
  saving: () => props.saving,
  validate: () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
  close,
  submit: (input) => emit('submit', input)
})
function submit() {
  return submission.submit(toInput())
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="editing ? t('ui.editUser') : t('ui.addUser')"
    width="min(560px, calc(100vw - 32px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    append-to-body
    @update:model-value="close"
  >
    <ElAlert
      v-if="user?.isSuperAdmin"
      :title="t('ui.superAdminProtectionHint')"
      type="info"
      :closable="false"
      style="margin-bottom: 16px"
    />
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
    >
      <ElFormItem :label="t('ui.username')" prop="username"
        ><ElInput
          v-model="form.username"
          :disabled="editing || saving"
          maxlength="64"
          :placeholder="t('ui.forExampleZhangsan')"
          autocomplete="off"
      /></ElFormItem>
      <ElFormItem v-if="!editing" :label="t('ui.initialPassword')" prop="password"
        ><ElInput
          v-model="form.password"
          :disabled="saving || submission.submitting.value"
          type="password"
          show-password
          maxlength="128"
          autocomplete="new-password"
          :placeholder="t('ui.passwordLengthPlaceholder')"
      /></ElFormItem>
      <ElFormItem :label="t('ui.displayName')" prop="displayName"
        ><ElInput
          v-model="form.displayName"
          :disabled="saving || submission.submitting.value"
          maxlength="100"
      /></ElFormItem>
      <ElFormItem :label="t('ui.assignedDepartment')"
        ><ElTreeSelect
          v-model="form.departmentId"
          :data="departmentOptions"
          node-key="id"
          value-key="id"
          :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
          check-strictly
          clearable
          :disabled="saving || submission.submitting.value"
          :placeholder="t('ui.departmentIsOptional')"
          style="width: 100%"
      /></ElFormItem>
      <ElFormItem :label="t('ui.email')" prop="email"
        ><ElInput
          v-model="form.email"
          :disabled="saving || submission.submitting.value"
          maxlength="255"
          :placeholder="t('ui.optional')"
      /></ElFormItem>
      <ElFormItem :label="t('ui.mobile')" prop="mobile"
        ><ElInput
          v-model="form.mobile"
          :disabled="saving || submission.submitting.value"
          maxlength="32"
          :placeholder="t('ui.optional')"
      /></ElFormItem>
      <ElFormItem :label="t('ui.avatarURL')"
        ><ElInput
          v-model="form.avatar"
          :disabled="saving || submission.submitting.value"
          maxlength="500"
          :placeholder="t('ui.optional')"
      /></ElFormItem>
      <ElFormItem :label="t('ui.roleLabel')">
        <ElSelect
          v-model="form.roleIds"
          multiple
          :disabled="saving || !hasPermission('system:user:assign-roles')"
          :placeholder="t('ui.selectMultipleRoles')"
          style="width: 100%"
        >
          <ElOption
            v-for="role in roles"
            :key="role.id"
            :label="`${role.name}${role.status === 0 ? t('ui.disabledSuffix') : ''}`"
            :value="role.id"
          />
        </ElSelect>
        <small>{{ t('ui.disabledRolesRemainLinkedButGrantNoEffectivePermissions') }}</small>
      </ElFormItem>
      <ElFormItem :label="t('ui.status')"
        ><ElRadioGroup v-model="form.status" :disabled="saving || user?.isSuperAdmin"
          ><ElRadio
            v-for="option in SYSTEM_STATUS_OPTIONS"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</ElRadio
          ></ElRadioGroup
        ></ElFormItem
      >
      <button type="submit" hidden aria-hidden="true" tabindex="-1" />
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving || submission.submitting.value" @click="close">{{
        t('ui.cancel')
      }}</ElButton
      ><ElButton type="primary" :loading="saving || submission.submitting.value" @click="submit">{{
        t('ui.save')
      }}</ElButton></template
    >
  </ElDialog>
</template>
