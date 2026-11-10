<script setup lang="ts">
import { Document, Download } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { buildCsv, downloadText } from '../../utils/csv'
import { createTaskSeed } from '../table/model'
import { usePermission } from '@/composables/usePermission'
const { t } = useI18n({ useScope: 'global' })
const { hasPermission } = usePermission()
function csv() {
  if (!hasPermission('system:download:download')) return
  downloadText(
    'example-tasks.csv',
    buildCsv(
      [
        { label: t('table.name'), value: (row) => row.name },
        { label: t('table.category'), value: (row) => t(`table.${row.category}`) },
        { label: t('table.budget'), value: (row) => row.budget }
      ],
      createTaskSeed()
    )
  )
}
function json() {
  if (!hasPermission('system:download:download')) return
  downloadText(
    'example-tasks.json',
    JSON.stringify(createTaskSeed(), null, 2),
    'application/json;charset=utf-8'
  )
}
</script>
<template>
  <section class="management-page">
    <header class="management-page__heading">
      <div>
        <span class="management-page__eyebrow">{{ t('table.eyebrow') }}</span>
        <h1>{{ t('ui.downloadExample') }}</h1>
        <p>{{ t('table.downloadDescription') }}</p>
      </div>
    </header>
    <ElAlert
      :title="t('table.downloadNotice')"
      type="info"
      show-icon
      :closable="false"
      class="download-notice"
    />
    <div v-if="hasPermission('system:download:download')" class="download-grid">
      <article class="management-page__table-card">
        <ElIcon><Document /></ElIcon>
        <h2>{{ t('table.csvTitle') }}</h2>
        <p>{{ t('table.csvDescription') }}</p>
        <ElButton type="primary" :icon="Download" @click="csv">{{
          t('table.downloadCsv')
        }}</ElButton>
      </article>
      <article class="management-page__table-card">
        <ElIcon><Document /></ElIcon>
        <h2>{{ t('table.jsonTitle') }}</h2>
        <p>{{ t('table.jsonDescription') }}</p>
        <ElButton :icon="Download" @click="json">{{ t('table.downloadJson') }}</ElButton>
      </article>
    </div>
    <ElResult v-else icon="warning" :title="t('ui.accessUnavailable')" />
  </section>
</template>
<style scoped lang="scss">
@use '@/assets/styles/management.scss';
.download-notice {
  margin-bottom: 22px;
}
.download-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  article > .el-icon {
    font-size: 30px;
    color: var(--np-color-primary);
    margin-bottom: 16px;
  }
  h2 {
    font-size: 18px;
  }
  p {
    font-size: 13px;
    line-height: 1.8;
    color: var(--np-text-secondary);
    margin: 12px 0 24px;
  }
}
@media (max-width: 767px) {
  .download-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
