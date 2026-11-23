<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

defineProps<{ title: string; description: string }>()

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
</script>

<template>
  <div class="error-page">
    <ElResult icon="warning" :title="title" :sub-title="description">
      <template #extra>
        <ElButton type="primary" @click="router.replace('/dashboard')">{{
          t('ui.backToDashboard')
        }}</ElButton>
      </template>
    </ElResult>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  display: grid;
  min-height: 100%;
  place-items: center;
  padding: 24px;
}
</style>
