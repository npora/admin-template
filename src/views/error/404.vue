<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ErrorResult from './ErrorResult.vue'

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <ErrorResult title="404" :description="t('ui.thisPageDoesNotExist')" />
</template>
