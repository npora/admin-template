<script setup lang="ts">
import { ArrowRight, Search } from '@element-plus/icons-vue'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { InputInstance } from 'element-plus'

import { menuLocation } from '@/layout/menu'
import { translateRouteTitle } from '@/locales'
import { localeRegistry } from '@/locales/registry'
import type { MenuItem } from '@/router/types'
import { usePermissionStore } from '@/store/modules/permission'

const open = defineModel<boolean>({ required: true })
const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const permissions = usePermissionStore()
const input = ref<InputInstance>()
const query = ref('')
const active = ref(0)
const listId = useId()
const sourceTitles = localeRegistry['zh-CN'].messages.routes
const englishTitles = localeRegistry['en-US'].messages.routes

interface SearchEntry {
  item: MenuItem
  title: string
  trail: string
  terms: string
}

function normalize(text: string): string {
  return text.normalize('NFKC').trim().toLowerCase()
}

function collect(items: MenuItem[], trail: string[] = []): SearchEntry[] {
  return items.flatMap((item) => {
    const title = translateRouteTitle(item.title, item.name)
    if (item.children?.length) return collect(item.children, [...trail, title])
    const routeKey = item.name as keyof typeof sourceTitles | undefined
    const english = routeKey && sourceTitles[routeKey] === item.title ? englishTitles[routeKey] : ''
    return [
      {
        item,
        title,
        trail: trail.join(' / '),
        terms: normalize(`${title} ${item.title} ${english} ${item.path}`)
      }
    ]
  })
}

const entries = computed(() => collect(permissions.menus))
const results = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  return entries.value
    .filter((entry) => terms.every((term) => entry.terms.includes(term)))
    .slice(0, 12)
})

watch(results, () => (active.value = 0))
watch(open, (visible) => {
  if (!visible) query.value = ''
})

function openPage(entry: SearchEntry): void {
  open.value = false
  void router.push(menuLocation(entry.item))
}

async function handleKey(event: Event): Promise<void> {
  if (!(event instanceof KeyboardEvent) || event.isComposing || !results.value.length) return
  if (event.key === 'Enter') {
    event.preventDefault()
    const entry = results.value[active.value]
    if (entry) openPage(entry)
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const count = results.value.length
    active.value = (active.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
    await nextTick()
    document.getElementById(`${listId}-${active.value}`)?.scrollIntoView({ block: 'nearest' })
  }
}
</script>

<template>
  <ElDialog
    v-model="open"
    :title="t('ui.menuSearch')"
    width="min(540px, calc(100vw - 32px))"
    @opened="input?.focus()"
  >
    <ElInput
      ref="input"
      v-model="query"
      :prefix-icon="Search"
      :placeholder="t('ui.menuSearchPlaceholder')"
      :aria-label="t('ui.menuSearch')"
      container-role="combobox"
      aria-autocomplete="list"
      :aria-expanded="results.length > 0"
      :aria-controls="listId"
      :aria-activedescendant="results.length ? `${listId}-${active}` : undefined"
      clearable
      @keydown="handleKey"
    />
    <div :id="listId" class="menu-search__results" role="listbox" :aria-label="t('ui.menuSearch')">
      <button
        v-for="(entry, index) in results"
        :id="`${listId}-${index}`"
        :key="entry.item.path"
        class="menu-search__result"
        type="button"
        role="option"
        :aria-selected="index === active"
        tabindex="-1"
        @click="openPage(entry)"
      >
        <span class="menu-search__result-name">{{ entry.title }}</span>
        <span v-if="entry.trail" class="menu-search__trail">{{ entry.trail }}</span>
        <ElIcon aria-hidden="true"><ArrowRight /></ElIcon>
      </button>
    </div>
    <p v-if="!results.length" class="menu-search__empty" role="status">
      {{ t('ui.menuSearchEmpty') }}
    </p>
    <template #footer>
      <span class="menu-search__hint">{{ t('ui.menuSearchKeyboard') }}</span>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.menu-search__results {
  display: grid;
  max-height: min(44vh, 300px);
  margin-top: 12px;
  overflow: auto;
}

.menu-search__result {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  text-align: start;
  color: var(--np-text-regular);
  background: transparent;
  border: 0;
  border-radius: var(--np-radius-base);
  cursor: pointer;

  &:hover,
  &[aria-selected='true'] {
    color: var(--np-color-primary);
    background: var(--np-primary-soft);
  }

  .el-icon {
    flex: none;
    margin-inline-start: auto;
  }
}

.menu-search__result-name,
.menu-search__trail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-search__trail,
.menu-search__hint,
.menu-search__empty {
  color: var(--np-text-secondary);
  font-size: 12px;
}

.menu-search__empty {
  margin: 20px 0 8px;
  text-align: center;
}
</style>
