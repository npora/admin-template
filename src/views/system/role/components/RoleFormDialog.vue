<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ManagedRole, RoleInput } from '@/api/types/role'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{ modelValue: boolean; role: ManagedRole | null; saving: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; submit: [input: RoleInput] }>()
const defaults = (): RoleInput => ({
  code: '',
  name: '',
  description: null,
  status: 1,
  sortOrder: 0
})
const form = reactive(defaults()),
  formRef = ref<FormInstance>()
const rules = computed<FormRules<RoleInput>>(() => ({
  code: [
    { required: true, message: t('ui.enterARoleCode'), trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9:_-]{0,63}$/,
      message: t('ui.roleCodeRule'),
      trigger: 'blur'
    }
  ],
  name: [
    { required: true, whitespace: true, message: t('ui.enterARoleName'), trigger: 'blur' },
    { max: 100, message: t('ui.upTo100Characters'), trigger: 'blur' }
  ]
}))
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    const role = props.role
    Object.assign(
      form,
      role
        ? {
            code: role.code,
            name: role.name,
            description: role.description,
            status: role.status,
            sortOrder: role.sortOrder
          }
        : defaults()
    )
    await nextTick()
    formRef.value?.clearValidate()
  }
)
function close() {
  if (!props.saving) emit('update:modelValue', false)
}
async function submit() {
  if (props.saving || !(await formRef.value?.validate().catch(() => false))) return
  emit('submit', {
    ...form,
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description?.trim() || null
  })
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="role ? t('ui.editRole') : t('ui.addRole')"
    width="min(520px, calc(100vw - 32px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    append-to-body
    @update:model-value="close"
  >
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
    >
      <ElFormItem :label="t('ui.roleCode')" prop="code"
        ><ElInput
          v-model="form.code"
          :disabled="saving"
          maxlength="64"
          :placeholder="t('ui.forExampleOperator')"
      /></ElFormItem>
      <ElFormItem :label="t('ui.roleName')" prop="name"
        ><ElInput v-model="form.name" :disabled="saving" maxlength="100"
      /></ElFormItem>
      <ElFormItem :label="t('ui.description')"
        ><ElInput
          v-model="form.description"
          :disabled="saving"
          type="textarea"
          maxlength="255"
          show-word-limit
      /></ElFormItem>
      <ElFormItem :label="t('ui.sortOrder')"
        ><ElInputNumber
          v-model="form.sortOrder"
          :disabled="saving"
          :min="0"
          :max="4294967295"
          :precision="0"
          :value-on-clear="0"
      /></ElFormItem>
      <ElFormItem :label="t('ui.status')"
        ><ElRadioGroup v-model="form.status" :disabled="saving"
          ><ElRadio
            v-for="option in SYSTEM_STATUS_OPTIONS"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</ElRadio
          ></ElRadioGroup
        ></ElFormItem
      >
      <button type="submit" hidden tabindex="-1" />
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="close">{{ t('ui.cancel') }}</ElButton
      ><ElButton type="primary" :loading="saving" @click="submit">{{
        t('ui.save')
      }}</ElButton></template
    >
  </ElDialog>
</template>
