<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { handleRequestError } from '@/api/errors/handling'
import { getDictTypes, createDictType, updateDictType, deleteDictType } from '@/api/modules/dict'
import type { DictType, DictTypeInput, DictItemInput } from '@/api/types/dict'
import { useDictionaryTable } from './useDictionaryTable'
import DictionaryForm from './components/DictionaryForm.vue'
import DictionaryItems from './components/DictionaryItems.vue'
const { t } = useI18n({ useScope: 'global' })
const {
  filters,
  query,
  rows,
  total,
  loading,
  loadFailed,
  saving,
  deletingId,
  busy,
  allowed,
  load,
  search,
  reset,
  changePage,
  changePageSize,
  save,
  remove
} = useDictionaryTable({
  permission: 'dict',
  list: getDictTypes,
  create: createDictType,
  update: updateDictType,
  remove: deleteDictType
})
const editing = ref<DictType | null>(null),
  selected = ref<DictType | null>(null),
  formVisible = ref(false),
  confirming = ref(false)
onMounted(() => {
  void load()
})
function open(row: DictType | null = null) {
  if (busy.value || !allowed(row ? 'update' : 'create')) return
  editing.value = row ? { ...row } : null
  formVisible.value = true
}
function closeItems() {
  selected.value = null
}
async function submit(input: DictTypeInput | DictItemInput) {
  if ('code' in input && (await save(input, editing.value?.id))) {
    formVisible.value = false
    ElMessage.success(t('dict.saved'))
  }
}
async function confirmDelete(row: DictType) {
  if (busy.value || confirming.value || row.itemCount || !allowed('delete')) return
  confirming.value = true
  try {
    await ElMessageBox.confirm(t('dict.confirmDeleteType', { name: row.name }), t('ui.delete'), {
      type: 'warning',
      confirmButtonText: t('ui.delete'),
      cancelButtonText: t('ui.cancel')
    })
    if (await remove(row.id)) ElMessage.success(t('dict.deleted'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    confirming.value = false
  }
}
</script>
<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('dict.eyebrow') }}</span>
        <h1>{{ t('dict.title') }}</h1>
        <p>{{ t('dict.description') }}</p>
      </div>
      <ElButton
        v-permission="'system:dict:create'"
        type="primary"
        :disabled="busy"
        @click="open()"
        >{{ t('dict.addType') }}</ElButton
      >
    </header>
    <template v-if="allowed('list')">
      <ElForm
        :model="filters"
        class="management-page__filters management-page__filters--compact"
        label-position="top"
        @submit.prevent="search"
      >
        <ElFormItem :label="t('ui.keyword')"
          ><ElInput v-model="filters.keyword" clearable :placeholder="t('dict.keyword')"
        /></ElFormItem>
        <ElFormItem :label="t('ui.status')"
          ><ElSelect v-model="filters.status" clearable :placeholder="t('ui.allStatuses')"
            ><ElOption
              v-for="option in SYSTEM_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value" /></ElSelect
        ></ElFormItem>
        <div class="management-page__filter-actions">
          <ElButton type="primary" native-type="submit" :loading="loading">{{
            t('ui.search')
          }}</ElButton
          ><ElButton @click="reset">{{ t('ui.reset') }}</ElButton>
        </div>
      </ElForm>
      <div class="management-page__table-card">
        <TableToolbar
          :title="t('dict.typeList')"
          :summary="t('dict.total', { value: total })"
          :loading="loading"
          :disabled="busy"
          @refresh="load"
        />
        <ElAlert v-if="loadFailed" :title="t('dict.loadFailed')" type="error" :closable="false" />
        <DataTable
          :data="rows"
          :loading="loading"
          pagination
          :page="query.page"
          :page-size="query.pageSize"
          :total="total"
          :pagination-disabled="loading || busy"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <ElTableColumn prop="name" :label="t('dict.name')" min-width="150" />
          <ElTableColumn prop="code" :label="t('dict.code')" min-width="180" />
          <ElTableColumn
            prop="remark"
            :label="t('dict.remark')"
            min-width="200"
            show-overflow-tooltip
          />
          <ElTableColumn prop="itemCount" :label="t('dict.itemCount')" width="100" />
          <ElTableColumn prop="sortOrder" :label="t('ui.sortOrder')" width="90" />
          <!-- @vue-generic {DictType} -->
          <ElTableColumn :label="t('ui.status')" width="90"
            ><template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                row.status === 1 ? t('ui.enabled') : t('ui.disabled')
              }}</ElTag></template
            ></ElTableColumn
          >
          <!-- @vue-generic {DictType} -->
          <ElTableColumn :label="t('ui.actions')" width="220" fixed="right"
            ><template #default="{ row }">
              <ElButton
                v-permission="'system:dict-item:list'"
                link
                type="primary"
                :disabled="busy"
                @click="selected = { ...row }"
                >{{ t('dict.items') }}</ElButton
              >
              <ElButton
                v-permission="'system:dict:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              >
              <ElButton
                v-permission="'system:dict:delete'"
                link
                type="danger"
                :disabled="busy || confirming || !!row.itemCount"
                :loading="deletingId === row.id"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              >
            </template></ElTableColumn
          >
          <template #empty><ElEmpty :description="t('dict.empty')" :image-size="72" /></template>
        </DataTable>
      </div>
    </template>
    <ElResult v-else icon="warning" :title="t('dict.forbidden')" />
    <DictionaryForm
      v-model="formVisible"
      kind="type"
      :input="editing"
      :saving="saving"
      @submit="submit"
    />
    <DictionaryItems v-if="selected" :type="selected" @close="closeItems" @changed="load" />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
</style>
