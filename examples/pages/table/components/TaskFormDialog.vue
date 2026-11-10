<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import { taskCategories, taskStatuses, type DemoTask, type TaskInput } from '../model'
const props = defineProps<{ modelValue: boolean; task: DemoTask | null; saving: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; submit: [value: TaskInput] }>()
const { t } = useI18n({ useScope: 'global' })
const form = reactive<TaskInput>({ name: '', category: 'engineering', status: 'draft', budget: 0 })
const formRef = ref<FormInstance>()
const rules = computed<FormRules<TaskInput>>(() => ({
  name: [
    { required: true, whitespace: true, message: t('table.nameRequired'), trigger: 'blur' },
    { max: 100, message: t('ui.upTo100Characters'), trigger: 'blur' }
  ],
  budget: [
    {
      type: 'number',
      required: true,
      min: 0,
      max: 10000000,
      message: t('table.budgetRule'),
      trigger: 'change'
    }
  ]
}))
watch(
  () => props.modelValue,
  async (value) => {
    if (!value) return
    Object.assign(
      form,
      props.task
        ? {
            name: props.task.name,
            category: props.task.category,
            status: props.task.status,
            budget: props.task.budget
          }
        : { name: '', category: 'engineering', status: 'draft', budget: 0 }
    )
    await nextTick()
    formRef.value?.clearValidate()
  }
)
async function submit() {
  if (props.saving || !(await formRef.value?.validate().catch(() => false))) return
  emit('submit', { ...form, name: form.name.trim() })
}
function close() {
  if (!props.saving) emit('update:modelValue', false)
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="task ? t('table.editTask') : t('table.addTask')"
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
      <ElFormItem :label="t('table.name')" prop="name"
        ><ElInput v-model="form.name" maxlength="100" :disabled="saving"
      /></ElFormItem>
      <div class="dialog-field-grid">
        <ElFormItem :label="t('table.category')"
          ><ElSelect v-model="form.category" :disabled="saving"
            ><ElOption
              v-for="value in taskCategories"
              :key="value"
              :value="value"
              :label="t(`table.${value}`)" /></ElSelect
        ></ElFormItem>
        <ElFormItem :label="t('ui.status')"
          ><ElSelect v-model="form.status" :disabled="saving"
            ><ElOption
              v-for="value in taskStatuses"
              :key="value"
              :value="value"
              :label="t(`table.${value}`)" /></ElSelect
        ></ElFormItem>
      </div>
      <ElFormItem :label="t('table.budget')" prop="budget"
        ><ElInputNumber
          v-model="form.budget"
          :min="0"
          :max="10000000"
          :precision="2"
          :disabled="saving"
      /></ElFormItem>
      <button hidden type="submit" tabindex="-1" />
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="close">{{ t('ui.cancel') }}</ElButton
      ><ElButton type="primary" :loading="saving" @click="submit">{{
        t('ui.save')
      }}</ElButton></template
    >
  </ElDialog>
</template>
