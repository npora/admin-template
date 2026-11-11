<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import type { DictItemInput, DictTypeInput, DictTagType } from '@/api/types/dict'
import type { SystemStatus } from '@/api/types/system'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
const props = defineProps<{
  modelValue: boolean
  kind: 'type' | 'item'
  input: DictTypeInput | DictItemInput | null
  saving: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: DictTypeInput | DictItemInput]
}>()
const { t } = useI18n({ useScope: 'global' })
const tags: DictTagType[] = ['primary', 'success', 'warning', 'danger', 'info']
const defaults = () => ({
  name: '',
  code: '',
  label: '',
  value: '',
  tagType: 'primary' as DictTagType,
  remark: null as string | null,
  sortOrder: 0,
  status: 1 as SystemStatus
})
const form = reactive(defaults()),
  formRef = ref<FormInstance>()
let initialInput = ''
const rules = computed<FormRules>(() => ({
  name: [{ required: true, whitespace: true, message: t('dict.required'), trigger: 'blur' }],
  code: [
    {
      required: true,
      pattern: /^[a-z][a-z0-9_]{0,63}$/,
      message: t('dict.codeRule'),
      trigger: 'blur'
    }
  ],
  label: [{ required: true, whitespace: true, message: t('dict.required'), trigger: 'blur' }],
  value: [{ required: true, whitespace: true, message: t('dict.required'), trigger: 'blur' }]
}))
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    Object.assign(form, defaults(), props.input ?? {})
    initialInput = JSON.stringify(toInput())
    await nextTick()
    formRef.value?.clearValidate()
  }
)
function close() {
  if (!props.saving) emit('update:modelValue', false)
}
function toInput(): DictTypeInput | DictItemInput {
  const common = {
    remark: form.remark?.trim() || null,
    sortOrder: form.sortOrder,
    status: form.status
  }
  return props.kind === 'type'
    ? { ...common, name: form.name.trim(), code: form.code.trim() }
    : { ...common, label: form.label.trim(), value: form.value.trim(), tagType: form.tagType }
}
async function submit() {
  if (props.saving) return
  const input = toInput()
  if (props.input && JSON.stringify(input) === initialInput) {
    close()
    return
  }
  if (!(await formRef.value?.validate().catch(() => false)) || props.saving) return
  emit('submit', input)
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="t(`dict.${input ? 'edit' : 'add'}${kind === 'type' ? 'Type' : 'Item'}`)"
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
      :disabled="saving"
      @submit.prevent="submit"
    >
      <template v-if="kind === 'type'">
        <ElFormItem :label="t('dict.name')" prop="name"
          ><ElInput v-model="form.name" maxlength="100"
        /></ElFormItem>
        <ElFormItem :label="t('dict.code')" prop="code"
          ><ElInput
            v-model="form.code"
            maxlength="64"
            :disabled="!!input"
            :placeholder="t('dict.codePlaceholder')"
          /><small class="dictionary-form__hint">{{ t('dict.codeHint') }}</small></ElFormItem
        >
      </template>
      <template v-else>
        <ElFormItem :label="t('dict.label')" prop="label"
          ><ElInput v-model="form.label" maxlength="100"
        /></ElFormItem>
        <ElFormItem :label="t('dict.value')" prop="value"
          ><ElInput v-model="form.value" maxlength="100" /><small class="dictionary-form__hint">{{
            t('dict.valueHint')
          }}</small></ElFormItem
        >
        <ElFormItem :label="t('dict.tagType')"
          ><ElSelect v-model="form.tagType"
            ><ElOption v-for="tag in tags" :key="tag" :label="t(`dict.color_${tag}`)" :value="tag"
              ><ElTag :type="tag">{{ t(`dict.color_${tag}`) }}</ElTag></ElOption
            ></ElSelect
          ></ElFormItem
        >
      </template>
      <ElFormItem :label="t('ui.sortOrder')"
        ><ElInputNumber
          v-model="form.sortOrder"
          :min="0"
          :max="2147483647"
          :precision="0"
          :value-on-clear="0"
      /></ElFormItem>
      <ElFormItem :label="t('ui.status')"
        ><ElRadioGroup v-model="form.status"
          ><ElRadio
            v-for="option in SYSTEM_STATUS_OPTIONS"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</ElRadio
          ></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem :label="t('dict.remark')"
        ><ElInput v-model="form.remark" type="textarea" maxlength="255" show-word-limit
      /></ElFormItem>
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
<style scoped>
.dictionary-form__hint {
  margin-top: 6px;
  color: var(--np-text-secondary);
  line-height: 1.6;
}
</style>
