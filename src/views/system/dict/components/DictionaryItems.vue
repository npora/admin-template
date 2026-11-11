<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import DataTable from '@/components/DataTable/index.vue'
import TableToolbar from '@/components/TableToolbar/index.vue'
import { SYSTEM_STATUS_OPTIONS } from '@/constants/system'
import { handleRequestError } from '@/api/errors/handling'
import { getDictItems, createDictItem, updateDictItem, deleteDictItem } from '@/api/modules/dict'
import type { DictType, DictItem, DictTypeInput, DictItemInput } from '@/api/types/dict'
import { useDictionaryTable } from '../useDictionaryTable'
import DictionaryForm from './DictionaryForm.vue'
const props = defineProps<{ type: DictType }>()
const emit = defineEmits<{ close: []; changed: [] }>()
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
} = useDictionaryTable<DictItem, DictItemInput>({
  permission: 'dict-item',
  list: (query, signal) => getDictItems(props.type.id, query, signal),
  create: (input) => createDictItem(props.type.id, input),
  update: (id, input) => updateDictItem(props.type.id, id, input),
  remove: (id) => deleteDictItem(props.type.id, id)
})
const visible = ref(true),
  formVisible = ref(false),
  editing = ref<DictItem | null>(null),
  confirming = ref(false)
onMounted(() => {
  void load()
})
function close() {
  if (!busy.value && !confirming.value) visible.value = false
}
function open(row: DictItem | null = null) {
  if (busy.value || !allowed(row ? 'update' : 'create')) return
  editing.value = row ? { ...row } : null
  formVisible.value = true
}
async function submit(input: DictTypeInput | DictItemInput) {
  if ('value' in input && (await save(input, editing.value?.id))) {
    formVisible.value = false
    emit('changed')
    ElMessage.success(t('dict.saved'))
  }
}
async function confirmDelete(row: DictItem) {
  if (busy.value || confirming.value || !allowed('delete')) return
  confirming.value = true
  try {
    await ElMessageBox.confirm(t('dict.confirmDeleteItem', { name: row.label }), t('ui.delete'), {
      type: 'warning',
      confirmButtonText: t('ui.delete'),
      cancelButtonText: t('ui.cancel')
    })
    if (await remove(row.id)) {
      emit('changed')
      ElMessage.success(t('dict.deleted'))
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') handleRequestError(error)
  } finally {
    confirming.value = false
  }
}
</script>
<template>
  <ElDrawer
    :model-value="visible"
    :title="t('dict.drawerTitle', { name: type.name })"
    size="min(1040px, 100vw)"
    :close-on-click-modal="!busy && !confirming"
    :close-on-press-escape="!busy && !confirming"
    :show-close="!busy && !confirming"
    append-to-body
    @update:model-value="close"
    @closed="emit('close')"
  >
    <section class="management-page dictionary-items">
      <ElAlert
        :title="t('dict.itemsHint', { code: type.code })"
        type="info"
        :closable="false"
        class="dictionary-items__hint"
      />
      <ElForm
        :model="filters"
        class="management-page__filters management-page__filters--compact"
        label-position="top"
        @submit.prevent="search"
      >
        <ElFormItem :label="t('ui.keyword')"
          ><ElInput v-model="filters.keyword" clearable :placeholder="t('dict.itemKeyword')"
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
          :title="t('dict.items')"
          :summary="t('dict.total', { value: total })"
          :loading="loading"
          :disabled="busy"
          @refresh="load"
          ><ElButton
            v-permission="'system:dict-item:create'"
            type="primary"
            :disabled="busy"
            @click="open()"
            >{{ t('dict.addItem') }}</ElButton
          ></TableToolbar
        >
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
          <ElTableColumn prop="label" :label="t('dict.label')" min-width="130" />
          <ElTableColumn prop="value" :label="t('dict.value')" min-width="140" />
          <!-- @vue-generic {DictItem} -->
          <ElTableColumn :label="t('dict.preview')" min-width="120"
            ><template #default="{ row }"
              ><ElTag :type="row.tagType">{{ row.label }}</ElTag></template
            ></ElTableColumn
          >
          <ElTableColumn prop="sortOrder" :label="t('ui.sortOrder')" width="90" />
          <!-- @vue-generic {DictItem} -->
          <ElTableColumn :label="t('ui.status')" width="90"
            ><template #default="{ row }"
              ><ElTag :type="row.status === 1 ? 'success' : 'info'">{{
                row.status === 1 ? t('ui.enabled') : t('ui.disabled')
              }}</ElTag></template
            ></ElTableColumn
          >
          <ElTableColumn
            prop="remark"
            :label="t('dict.remark')"
            min-width="150"
            show-overflow-tooltip
          />
          <!-- @vue-generic {DictItem} -->
          <ElTableColumn :label="t('ui.actions')" width="140" fixed="right"
            ><template #default="{ row }"
              ><ElButton
                v-permission="'system:dict-item:update'"
                link
                type="primary"
                :disabled="busy"
                @click="open(row)"
                >{{ t('ui.edit') }}</ElButton
              ><ElButton
                v-permission="'system:dict-item:delete'"
                link
                type="danger"
                :disabled="busy || confirming"
                :loading="deletingId === row.id"
                @click="confirmDelete(row)"
                >{{ t('ui.delete') }}</ElButton
              ></template
            ></ElTableColumn
          >
          <template #empty><ElEmpty :description="t('dict.empty')" :image-size="72" /></template>
        </DataTable>
      </div>
    </section>
    <DictionaryForm
      v-model="formVisible"
      kind="item"
      :input="editing"
      :saving="saving"
      @submit="submit"
    />
  </ElDrawer>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
.dictionary-items {
  padding: 0;
  &__hint {
    margin-bottom: 20px;
  }
}
</style>
