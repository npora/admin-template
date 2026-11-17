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
@use './index.scss';
</style>
