<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { activeTimeZone, WALL_TIME_FORMAT, zonedDate } from '@/utils/datetime'
import type { TimestampRange } from '@/types/timezone'
import { fromPickerRange, toPickerRange } from './model'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue?: number[] | null
    type?: 'daterange' | 'datetimerange'
    format?: string
  }>(),
  { modelValue: null, type: 'datetimerange' }
)
const emit = defineEmits<{
  'update:modelValue': [value: TimestampRange | null]
  change: [value: TimestampRange | null]
  invalid: []
}>()
const { t } = useI18n({ useScope: 'global' })
const revision = ref(0)
const withTime = computed(() => props.type === 'datetimerange')
const displayed = computed(() =>
  toPickerRange(props.modelValue, activeTimeZone.value, withTime.value)
)
const panelDate = computed(() => {
  const today = zonedDate(Date.now())
  return new Date(today.year(), today.month(), today.date(), 12)
})
function convert(value: unknown) {
  return fromPickerRange(value, activeTimeZone.value, withTime.value)
}
function update(value: unknown) {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    emit('update:modelValue', null)
    return
  }
  const range = convert(value)
  if (range) emit('update:modelValue', range)
  else {
    revision.value++
    ElMessage.warning(t('timezone.invalidTime'))
    emit('invalid')
  }
}
function change(value: unknown) {
  if (value == null || (Array.isArray(value) && value.length === 0)) emit('change', null)
  else {
    const range = convert(value)
    if (range) emit('change', range)
  }
}
</script>

<template>
  <ElDatePicker
    :key="`${activeTimeZone}:${revision}`"
    v-bind="$attrs"
    :model-value="displayed"
    :type="type"
    :format="format || (withTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD')"
    :value-format="withTime ? WALL_TIME_FORMAT : 'YYYY-MM-DD'"
    :default-value="panelDate"
    :show-now="false"
    @update:model-value="update"
    @change="change"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps"
      ><slot :name="name" v-bind="slotProps || {}"
    /></template>
  </ElDatePicker>
</template>
