<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ref } from 'vue'
import PagePlaceholder from '@/components/PagePlaceholder/index.vue'

const { t } = useI18n({ useScope: 'global' })

const value = ref('')
</script>

<template>
  <PagePlaceholder :title="t('ui.pageCacheExample')" :description="t('ui.cacheExampleDescription')">
    <ElInput
      v-model="value"
      :placeholder="t('ui.enterTextToTestCaching')"
      style="width: min(320px, 100%)"
    />
  </PagePlaceholder>
</template>
