<script setup lang="ts">
import { useFormSubmit } from '@/composables/useFormSubmit'
import { useI18n } from 'vue-i18n'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { ManagedMenu, MenuInput } from '@/api/types/menu'
import type { RouteQuery } from '@/api/types/route'
import { MENU_TYPE_OPTIONS } from '@/constants/menu'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  modelValue: boolean
  menu: ManagedMenu | null
  tree: ManagedMenu[]
  saving: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; submit: [input: MenuInput] }>()
const defaults = (): MenuInput => ({
  parentId: 0,
  type: 2,
  title: '',
  name: null,
  path: null,
  component: null,
  redirect: null,
  routeQuery: null,
  activeMenu: null,
  icon: null,
  permission: null,
  visible: true,
  alwaysShow: false,
  keepAlive: false,
  fixedTab: false,
  sortOrder: 0,
  status: 1
})
const form = reactive(defaults()),
  queryText = ref(''),
  formRef = ref<FormInstance>()
const pages = Object.keys(import.meta.glob('/src/views/**/index.vue'))
  .filter((path) => !path.includes('/components/') && !path.includes('/login/'))
  .map((path) => path.replace('/src/views/', '').replace('.vue', ''))
interface ParentOption {
  id: number
  title: string
  disabled: boolean
  children?: ParentOption[]
}
const parentOptions = computed(() => {
  function map(items: ManagedMenu[]): ParentOption[] {
    return items
      .filter((item) => item.id !== props.menu?.id && item.type !== 3)
      .map((item) => ({
        id: item.id,
        title: item.title,
        disabled: form.type === 3 ? item.type !== 2 : item.type !== 1,
        children: map(item.children ?? [])
      }))
  }
  return [{ id: 0, title: t('ui.rootNode'), disabled: form.type === 3, children: map(props.tree) }]
})
const rules = computed<FormRules<MenuInput>>(() => ({
  title: [{ required: true, whitespace: true, message: t('ui.enterAName'), trigger: 'blur' }],
  name: [{ required: true, message: t('ui.enterARouteName'), trigger: 'blur' }],
  path: [{ required: true, message: t('ui.enterAPath'), trigger: 'blur' }],
  component: [{ required: true, message: t('ui.selectAPageComponent'), trigger: 'change' }],
  permission: [{ required: true, message: t('ui.enterAButtonPermissionCode'), trigger: 'blur' }]
}))
watch(
  () => form.type,
  (type) => {
    if (type === 3) {
      form.name = form.path = form.component = form.redirect = form.activeMenu = form.icon = null
      form.keepAlive = form.fixedTab = form.alwaysShow = false
      queryText.value = ''
    } else {
      form.permission = null
      if (type === 1) form.name = form.component = null
      if (type === 2) form.redirect = null
    }
  }
)
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    const source = props.menu
    const {
      children: _children,
      id: _id,
      createdAt: _created,
      updatedAt: _updated,
      ...fields
    } = source ?? { ...defaults(), id: 0, createdAt: '', updatedAt: '', children: [] }
    Object.assign(form, fields, { parentId: source?.parentId ?? 0 })
    await nextTick()
    queryText.value = source?.routeQuery ? JSON.stringify(source.routeQuery, null, 2) : ''
    const input = toInput()
    if (input) submission.reset(input)
    formRef.value?.clearValidate()
  }
)
function close() {
  if (!props.saving) emit('update:modelValue', false)
}
function toInput(): MenuInput | undefined {
  let query: RouteQuery | null = null
  try {
    query = queryText.value.trim() ? JSON.parse(queryText.value) : null
    if (
      query !== null &&
      (typeof query !== 'object' ||
        Array.isArray(query) ||
        Object.values(query).some(
          (value) => !['string', 'number', 'boolean'].includes(typeof value)
        ))
    )
      throw new Error()
  } catch {
    ElMessage.error(t('ui.defaultQueryMustBeAValidJSONObjectWithStringNumberOr'))
    return
  }
  const result: MenuInput = {
    ...form,
    parentId: form.parentId || null,
    title: form.title.trim(),
    routeQuery: query
  }
  for (const key of [
    'name',
    'path',
    'component',
    'redirect',
    'activeMenu',
    'icon',
    'permission'
  ] as const)
    result[key] = form[key]?.trim() || null
  return result
}
const submission = useFormSubmit<MenuInput>({
  active: () => props.modelValue,
  editing: () => props.menu !== null,
  saving: () => props.saving,
  validate: () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
  close,
  submit: (input) => emit('submit', input)
})
function submit() {
  if (props.saving) return
  return submission.submit(toInput())
}
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    :title="menu ? t('ui.editNode') : t('ui.addNode')"
    width="min(680px, calc(100vw - 32px))"
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
      <ElFormItem :label="t('ui.nodeType')"
        ><ElRadioGroup v-model="form.type" :disabled="saving || !!menu?.children?.length"
          ><ElRadio v-for="option in MENU_TYPE_OPTIONS" :key="option.value" :value="option.value">{{
            option.label
          }}</ElRadio></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem :label="t('ui.parentNode')"
        ><ElTreeSelect
          v-model="form.parentId"
          :data="parentOptions"
          node-key="id"
          value-key="id"
          :props="{ label: 'title', children: 'children', disabled: 'disabled' }"
          check-strictly
          :disabled="saving || submission.submitting.value"
          style="width: 100%"
      /></ElFormItem>
      <ElFormItem :label="t('ui.name')" prop="title"
        ><ElInput
          v-model="form.title"
          :disabled="saving || submission.submitting.value"
          maxlength="100"
      /></ElFormItem>
      <ElFormItem v-if="form.type !== 3" :label="t('ui.routePath')" prop="path"
        ><ElInput
          v-model="form.path"
          :disabled="saving || submission.submitting.value"
          maxlength="255"
          :placeholder="t('ui.forExampleSystemForARootOrUserForAChild')"
      /></ElFormItem>
      <ElFormItem v-if="form.type === 2" :label="t('ui.routeName')" prop="name"
        ><ElInput
          v-model="form.name"
          :disabled="saving || submission.submitting.value"
          maxlength="100"
          :placeholder="t('ui.forExampleSystemUserMustBeGloballyUnique')"
      /></ElFormItem>
      <ElFormItem v-if="form.type === 2" :label="t('ui.pageComponent')" prop="component"
        ><ElSelect
          v-model="form.component"
          filterable
          :disabled="saving || submission.submitting.value"
          style="width: 100%"
          ><ElOption v-for="page in pages" :key="page" :label="page" :value="page" /></ElSelect
      ></ElFormItem>
      <ElFormItem v-if="form.type === 1" :label="t('ui.redirect')"
        ><ElInput
          v-model="form.redirect"
          :disabled="saving || submission.submitting.value"
          maxlength="255"
          :placeholder="t('ui.leaveEmptyForTheFirstChildPageOrEnterAnAbsoluteInternal')"
      /></ElFormItem>
      <ElFormItem v-if="form.type === 3" :label="t('ui.permissionCode')" prop="permission"
        ><ElInput
          v-model="form.permission"
          :disabled="saving || submission.submitting.value"
          maxlength="150"
          :placeholder="t('ui.forExampleSystemUserCreate')"
      /></ElFormItem>
      <template v-if="form.type !== 3">
        <ElFormItem :label="t('ui.iconName')"
          ><ElInput
            v-model="form.icon"
            :disabled="saving || submission.submitting.value"
            maxlength="100"
            :placeholder="t('ui.forExampleHouseUserOrSetting')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.activeMenuPath')"
          ><ElInput
            v-model="form.activeMenu"
            :disabled="saving || submission.submitting.value"
            maxlength="255"
            :placeholder="t('ui.forHiddenDetailPagesForExampleSystemUser')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.defaultQueryJSON')"
          ><ElInput
            v-model="queryText"
            :disabled="saving || submission.submitting.value"
            type="textarea"
            :rows="3"
            :placeholder="t('ui.forExample')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.visibilityAndCaching')"
          ><div class="menu-switches">
            <ElCheckbox v-model="form.visible" :disabled="saving || submission.submitting.value">{{
              t('ui.showMenu')
            }}</ElCheckbox><ElCheckbox
              v-model="form.alwaysShow"
              :disabled="saving || submission.submitting.value"
              >{{ t('ui.alwaysShowParent') }}</ElCheckbox
            ><ElCheckbox v-model="form.keepAlive" :disabled="saving || form.type !== 2">{{
              t('ui.cachePage')
            }}</ElCheckbox
            ><ElCheckbox v-model="form.fixedTab" :disabled="saving || form.type !== 2">{{
              t('ui.pinTab')
            }}</ElCheckbox>
          </div></ElFormItem
        >
      </template>
      <ElFormItem :label="t('ui.sortOrder')"
        ><ElInputNumber
          v-model="form.sortOrder"
          :min="0"
          :max="4294967295"
          :precision="0"
          :value-on-clear="0"
          :disabled="saving || submission.submitting.value"
      /></ElFormItem>
      <ElFormItem :label="t('ui.status')"
        ><ElRadioGroup v-model="form.status" :disabled="saving || submission.submitting.value"
          ><ElRadio
            v-for="option in SYSTEM_STATUS_OPTIONS"
            :key="option.value"
            :value="option.value"
            >{{ option.label }}</ElRadio
          ></ElRadioGroup
        ></ElFormItem
      >
      <button hidden type="submit" tabindex="-1" />
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
<style scoped>
.menu-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
