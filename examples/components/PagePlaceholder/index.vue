<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useRouter } from 'vue-router'

const { t } = useI18n({ useScope: 'global' })

defineProps<{ title: string; description: string }>()
const router = useRouter()
</script>

<template>
  <section class="page-placeholder">
    <h1>{{ title }}</h1>
    <ElEmpty :description="description">
      <slot>
        <ElButton type="primary" @click="router.push('/system/user')">{{
          t('ui.viewUserManagementExample')
        }}</ElButton>
      </slot>
    </ElEmpty>
  </section>
</template>

<style scoped lang="scss">
.page-placeholder {
  margin: 24px;
  padding: 24px;
  border: 1px solid var(--np-border-color-lighter);
  border-radius: var(--np-radius-medium);
  background: var(--np-bg-container);

  h1 {
    font-size: 20px;
    font-weight: 600;
  }
}
@media (max-width: 767px) {
  .page-placeholder {
    margin: 16px;
    padding: 16px;
  }
}
</style>
