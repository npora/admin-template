<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppPreferenceFields from '@/components/AppPreferenceFields/index.vue'

const { t } = useI18n({ useScope: 'global' })
const fields = ref<InstanceType<typeof AppPreferenceFields>>()

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    :title="t('ui.appSettings')"
    size="min(340px, 100vw)"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <AppPreferenceFields ref="fields" />

    <template #footer>
      <div class="app-settings__actions">
        <ElButton @click="fields?.resetPreferences()">{{ t('ui.restoreDefaults') }}</ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
