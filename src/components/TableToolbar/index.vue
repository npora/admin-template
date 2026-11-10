<script setup lang="ts">
import { Refresh, Setting, Operation } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { ComponentSize } from '@/store/modules/app/types'
export interface TableColumnOption {
  key: string
  label: string
  required?: boolean
}
const props = defineProps<{
  title: string
  summary?: string
  loading?: boolean
  disabled?: boolean
  columns?: TableColumnOption[]
}>()
const visibleColumns = defineModel<string[]>('visibleColumns', { default: () => [] })
const size = defineModel<ComponentSize>('size', { default: 'default' })
const emit = defineEmits<{ refresh: [] }>()
const { t } = useI18n({ useScope: 'global' })
function updateColumns(value: unknown) {
  if (!Array.isArray(value)) return
  const keys =
    props.columns
      ?.filter((column) => column.required || value.includes(column.key))
      .map((column) => column.key) ?? []
  if (keys.length) visibleColumns.value = keys
}
function updateSize(value: string | number | object) {
  if (value === 'small' || value === 'default' || value === 'large') size.value = value
}
</script>
<template>
  <div class="table-toolbar">
    <div class="table-toolbar__heading">
      <h2>{{ title }}</h2>
      <span v-if="summary">{{ summary }}</span>
    </div>
    <div class="table-toolbar__actions">
      <slot />
      <template v-if="columns?.length">
        <ElDropdown trigger="click" @command="updateSize"
          ><ElButton
            :icon="Operation"
            :aria-label="t('table.density')"
            :title="t('table.density')"
            :disabled="disabled"
            circle
          />
          <template #dropdown
            ><ElDropdownMenu
              ><ElDropdownItem
                v-for="value in ['large', 'default', 'small'] as const"
                :key="value"
                :command="value"
                :disabled="value === size"
                >{{ t(`ui.${value}`) }}</ElDropdownItem
              ></ElDropdownMenu
            ></template
          >
        </ElDropdown>
        <ElPopover placement="bottom-end" :width="220" trigger="click"
          ><template #reference
            ><ElButton
              :icon="Setting"
              :aria-label="t('table.columns')"
              :title="t('table.columns')"
              :disabled="disabled"
              circle
          /></template>
          <strong>{{ t('table.columns') }}</strong
          ><ElCheckboxGroup
            :model-value="visibleColumns"
            class="table-toolbar__columns"
            @change="updateColumns"
            ><ElCheckbox
              v-for="column in columns"
              :key="column.key"
              :value="column.key"
              :disabled="column.required"
              >{{ column.label }}</ElCheckbox
            ></ElCheckboxGroup
          >
        </ElPopover>
      </template>
      <ElButton
        :icon="Refresh"
        :loading="loading"
        :disabled="disabled"
        :aria-label="t('ui.refresh')"
        :title="t('ui.refresh')"
        circle
        @click="emit('refresh')"
      />
    </div>
  </div>
</template>
<style scoped lang="scss">
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}
.table-toolbar__heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  h2 {
    font-size: 15px;
    font-weight: 600;
  }
  > span {
    font-size: 11px;
    color: var(--np-text-secondary);
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--np-fill-color-light);
  }
}
.table-toolbar__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
.table-toolbar__columns {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  :deep(.el-checkbox) {
    margin-right: 0;
  }
}
</style>
