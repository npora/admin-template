<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getIcon, iconGroups } from '@/icons'

const model = defineModel<string | null>({ required: true })
defineProps<{ disabled?: boolean }>()
const { t } = useI18n({ useScope: 'global' })
const selectedIcon = computed(() => getIcon(model.value))
</script>

<template>
  <ElSelect
    v-model="model"
    class="menu-icon-picker"
    :placeholder="t('ui.selectMenuIcon')"
    :aria-label="t('ui.iconName')"
    :disabled="disabled"
    :value-on-clear="null"
    clearable
    filterable
  >
    <template v-if="selectedIcon" #prefix>
      <ElIcon class="menu-icon-picker__preview"><component :is="selectedIcon" /></ElIcon>
    </template>
    <ElOption v-if="model && !selectedIcon" :value="model" :label="model" />
    <ElOptionGroup label="Element Plus">
      <ElOption v-for="[name, icon] in iconGroups.element" :key="name" :value="name" :label="name">
        <span class="menu-icon-picker__option"
          ><ElIcon><component :is="icon" /></ElIcon>{{ name }}</span
        >
      </ElOption>
    </ElOptionGroup>
    <ElOptionGroup :label="t('ui.localSvgIcons')">
      <ElOption v-for="[name, icon] in iconGroups.local" :key="name" :value="name" :label="name">
        <span class="menu-icon-picker__option"
          ><ElIcon><component :is="icon" /></ElIcon>{{ name }}</span
        >
      </ElOption>
    </ElOptionGroup>
  </ElSelect>
</template>

<style scoped lang="scss">
.menu-icon-picker {
  width: 100%;
}

.menu-icon-picker__preview {
  color: var(--np-color-primary);
}

.menu-icon-picker__option {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  .el-icon {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: var(--np-fill-color-light);
    color: var(--np-color-primary);
  }
}
</style>
