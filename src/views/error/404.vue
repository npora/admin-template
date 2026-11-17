<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useRouter } from 'vue-router'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
</script>

<template>
  <div class="not-found-page">
    <ElResult
      icon="warning"
      title="404"
      :sub-title="t('ui.thisPageDoesNotExistOrYourAccountCannotAccessIt')"
    >
      <template #extra>
        <ElButton type="primary" @click="router.replace('/dashboard')">{{
          t('ui.backToDashboard')
        }}</ElButton>
      </template>
    </ElResult>
  </div>
</template>

<style scoped lang="scss">
@use './404.scss' as error-page;
</style>
