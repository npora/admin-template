<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { DepartmentInput, ManagedDepartment } from '@/api/types/department'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  modelValue: boolean
  department: ManagedDepartment | null
  tree: ManagedDepartment[]
  saving: boolean
  parentId: number | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: DepartmentInput]
}>()
const defaults = (): DepartmentInput => ({
  parentId: 0,
  name: '',
  code: null,
  leader: null,
  phone: null,
  email: null,
  sortOrder: 0,
  status: 1
})
const form = reactive(defaults()),
  formRef = ref<FormInstance>()
interface ParentOption {
  id: number
  name: string
  children?: ParentOption[]
}
const parents = computed(() => {
  function map(nodes: ManagedDepartment[]): ParentOption[] {
    return nodes
      .filter((node) => node.id !== props.department?.id)
      .map((node) => ({
        id: node.id,
        name: `${node.name}${node.status === 0 ? t('ui.disabledSuffix') : ''}`,
        children: map(node.children ?? [])
      }))
  }
  return [{ id: 0, name: t('ui.rootDepartment'), children: map(props.tree) }]
})
const rules = computed<FormRules<DepartmentInput>>(() => ({
  name: [
    { required: true, whitespace: true, message: t('ui.enterADepartmentName'), trigger: 'blur' },
    { max: 100, message: t('ui.upTo100Characters'), trigger: 'blur' }
  ],
  email: [{ type: 'email', message: t('ui.enterAValidEmailAddress'), trigger: 'blur' }]
}))
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    const source = props.department
    Object.assign(
      form,
      source
        ? {
            parentId: source.parentId ?? 0,
            name: source.name,
            code: source.code,
            leader: source.leader,
            phone: source.phone,
            email: source.email,
            sortOrder: source.sortOrder,
            status: source.status
          }
        : { ...defaults(), parentId: props.parentId ?? 0 }
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
    parentId: form.parentId || null,
    name: form.name.trim(),
    code: form.code?.trim() || null,
    leader: form.leader?.trim() || null,
    phone: form.phone?.trim() || null,
    email: form.email?.trim() || null
  })
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="department ? t('ui.editDepartment') : t('ui.addDepartment')"
    width="min(580px, calc(100vw - 32px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    append-to-body
    @update:model-value="close"
  >
    <p class="dialog-description">
      {{ t('ui.manageTheHierarchyDepartmentLeadsAndContactDetails') }}
    </p>
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
    >
      <ElFormItem :label="t('ui.parentDepartment')"
        ><ElTreeSelect
          v-model="form.parentId"
          :data="parents"
          node-key="id"
          value-key="id"
          :props="{ label: 'name', children: 'children' }"
          check-strictly
          :disabled="saving"
          style="width: 100%"
      /></ElFormItem>
      <div class="dialog-field-grid">
        <ElFormItem :label="t('ui.departmentName')" prop="name"
          ><ElInput
            v-model="form.name"
            :disabled="saving"
            maxlength="100"
            :placeholder="t('ui.forExampleProductEngineering')" /></ElFormItem
        ><ElFormItem :label="t('ui.departmentCode')"
          ><ElInput
            v-model="form.code"
            :disabled="saving"
            maxlength="64"
            :placeholder="t('ui.optionalMustBeUniqueWhenProvided')"
        /></ElFormItem>
      </div>
      <div class="dialog-field-grid">
        <ElFormItem :label="t('ui.departmentLead')"
          ><ElInput
            v-model="form.leader"
            :disabled="saving"
            maxlength="100"
            :placeholder="t('ui.enterTheDepartmentLead')" /></ElFormItem
        ><ElFormItem :label="t('ui.phone')"
          ><ElInput
            v-model="form.phone"
            :disabled="saving"
            maxlength="32"
            :placeholder="t('ui.enterAPhoneNumber')"
        /></ElFormItem>
      </div>
      <ElFormItem :label="t('ui.contactEmail')" prop="email"
        ><ElInput
          v-model="form.email"
          :disabled="saving"
          maxlength="255"
          placeholder="name@example.com"
      /></ElFormItem>
      <div class="dialog-field-grid">
        <ElFormItem :label="t('ui.sortOrder')"
          ><ElInputNumber
            v-model="form.sortOrder"
            :disabled="saving"
            :min="0"
            :max="4294967295"
            :precision="0"
            :value-on-clear="0" /></ElFormItem
        ><ElFormItem :label="t('ui.status')"
          ><ElRadioGroup v-model="form.status" :disabled="saving"
            ><ElRadio
              v-for="option in SYSTEM_STATUS_OPTIONS"
              :key="option.value"
              :value="option.value"
              >{{ option.label }}</ElRadio
            ></ElRadioGroup
          ></ElFormItem
        >
      </div>
      <button type="submit" hidden tabindex="-1" />
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="close">{{ t('ui.cancel') }}</ElButton
      ><ElButton type="primary" :loading="saving" @click="submit">{{
        t('ui.saveDepartment')
      }}</ElButton></template
    >
  </ElDialog>
</template>
