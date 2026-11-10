<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { storeToRefs } from 'pinia'
import { ArrowDown, UserFilled } from '@element-plus/icons-vue'

import { useAppStore } from '@/store/modules/app'
import { useUserStore } from '@/store/modules/user'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()

defineProps<{ refreshing?: boolean }>()

const emit = defineEmits<{
  logout: []
  refresh: []
}>()

const appStore = useAppStore()
const userStore = useUserStore()

const { isMobile } = storeToRefs(appStore)

const { avatar, displayName } = storeToRefs(userStore)

function handleCommand(command: string | number | object): void {
  if (command === 'profile') void router.push('/profile')
  if (command === 'refresh') emit('refresh')
  if (command === 'logout') {
    emit('logout')
  }
}
</script>

<template>
  <ElDropdown trigger="click" @command="handleCommand">
    <button class="app-user" type="button" :aria-label="t('ui.userMenu')">
      <ElAvatar v-if="avatar" :size="30" :src="avatar" />

      <ElAvatar v-else :size="30" :icon="UserFilled" />

      <span v-if="!isMobile" class="app-user__name">
        {{ displayName }}
      </span>

      <ElIcon v-if="!isMobile" class="app-user__arrow" :size="12">
        <ArrowDown />
      </ElIcon>
    </button>

    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem command="profile">{{ t('profile.title') }}</ElDropdownItem>
        <ElDropdownItem command="refresh" :disabled="refreshing">{{
          refreshing ? t('ui.refreshingPermissions') : t('ui.refreshPermissions')
        }}</ElDropdownItem>
        <ElDropdownItem command="logout">{{ t('ui.signOut') }}</ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
