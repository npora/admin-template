<script setup lang="ts">
import LocaleSwitch from '@/components/LocaleSwitch/index.vue'
import { useI18n } from 'vue-i18n'

import { computed, defineAsyncComponent, ref, useTemplateRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import {
  Expand,
  Fold,
  FullScreen,
  Menu,
  Search,
  Setting,
  Moon,
  Sunny
} from '@element-plus/icons-vue'

import { handleRequestError } from '@/api/errors/handling'
import { useFullscreen } from '@/composables/useFullscreen'
import { useSession } from '@/composables/useSession'
import { useAppStore } from '@/store/modules/app'

import AppBreadcrumb from '@/layout/components/AppBreadcrumb/index.vue'
import { localIcons } from '@/icons/local'
import AppLockScreen from '@/layout/components/AppLockScreen/index.vue'
import AppSettings from '@/layout/components/AppSettings/index.vue'
import AppUser from '@/layout/components/AppUser/index.vue'

defineProps<{ showSidebarToggle: boolean }>()

const { t } = useI18n({ useScope: 'global' })

const appStore = useAppStore()

const { sidebarOpened, isMobile, settings } = storeToRefs(appStore)

const lockScreen = useTemplateRef<InstanceType<typeof AppLockScreen>>('lockScreen')
const settingsVisible = ref(false)
const searchMounted = ref(false)
const searchVisible = ref(false)
const AppMenuSearch = defineAsyncComponent(
  () => import('@/layout/components/AppMenuSearch/index.vue')
)

const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen()

const { logout, refreshAuthorization } = useSession()
const refreshingPermissions = ref(false)
async function handleRefreshPermissions() {
  if (refreshingPermissions.value) return
  refreshingPermissions.value = true
  try {
    if (await refreshAuthorization()) ElMessage.success(t('ui.permissionsUpdated'))
  } catch (error) {
    handleRequestError(error)
  } finally {
    refreshingPermissions.value = false
  }
}

const sidebarIcon = computed(() => {
  if (isMobile.value) {
    return Menu
  }

  return sidebarOpened.value ? Fold : Expand
})

const sidebarLabel = computed(() => {
  if (isMobile.value) {
    return sidebarOpened.value ? t('ui.closeMenu') : t('ui.openMenu')
  }

  return sidebarOpened.value ? t('ui.collapseSidebar') : t('ui.expandSidebar')
})

async function handleFullscreen(): Promise<void> {
  if (!(await toggleFullscreen())) ElMessage.warning(t('ui.yourBrowserDidNotAllowFullscreen'))
}

function openSettings(): void {
  settingsVisible.value = true
}

function openSearch(): void {
  searchMounted.value = true
  searchVisible.value = true
}

const signingOut = ref(false)

async function handleLogout(): Promise<void> {
  if (signingOut.value) return
  signingOut.value = true
  try {
    const confirmed = await ElMessageBox.confirm(t('ui.signOutConfirm'), t('ui.signOut'), {
      type: 'warning',
      confirmButtonText: t('ui.signOut'),
      cancelButtonText: t('ui.cancel'),
      closeOnClickModal: false
    }).then(
      () => true,
      () => false
    )
    if (confirmed) await logout()
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <ElButton
        v-if="showSidebarToggle"
        text
        circle
        :aria-label="sidebarLabel"
        @click="appStore.toggleSidebar"
      >
        <ElIcon :size="20">
          <component :is="sidebarIcon" />
        </ElIcon>
      </ElButton>

      <slot name="navigation">
        <AppBreadcrumb v-if="!isMobile && settings.layout.showBreadcrumb" />
      </slot>
    </div>

    <div class="app-header__right">
      <ElTooltip :content="t('ui.menuSearch')" placement="bottom">
        <ElButton text circle :aria-label="t('ui.menuSearch')" @click="openSearch">
          <ElIcon :size="18"><Search /></ElIcon>
        </ElButton>
      </ElTooltip>
      <LocaleSwitch />
      <ElTooltip
        :content="appStore.isDark ? t('ui.switchToLightMode') : t('ui.switchToDarkMode')"
        placement="bottom"
        ><ElButton
          text
          circle
          :aria-label="appStore.isDark ? t('ui.switchToLightMode') : t('ui.switchToDarkMode')"
          @click="appStore.setTheme(appStore.isDark ? 'light' : 'dark')"
          ><ElIcon :size="18"><component :is="appStore.isDark ? Sunny : Moon" /></ElIcon></ElButton
      ></ElTooltip>
      <ElTooltip
        v-if="isSupported"
        :content="isFullscreen ? t('ui.exitFullscreen') : t('ui.enterFullscreen')"
        placement="bottom"
      >
        <ElButton
          text
          circle
          :aria-label="isFullscreen ? t('ui.exitFullscreen') : t('ui.enterFullscreen')"
          @click="handleFullscreen"
        >
          <ElIcon :size="18">
            <FullScreen />
          </ElIcon>
        </ElButton>
      </ElTooltip>

      <ElTooltip :content="t('ui.lockScreen')" placement="bottom">
        <ElButton text circle :aria-label="t('ui.lockScreen')" @click="lockScreen?.lock()">
          <ElIcon :size="18"><component :is="localIcons['nova-screen-lock']" /></ElIcon>
        </ElButton>
      </ElTooltip>

      <span class="app-header__separator" />
      <AppUser
        :refreshing="refreshingPermissions"
        @refresh="handleRefreshPermissions"
        @logout="handleLogout"
      />

      <ElTooltip :content="t('ui.appSettings')" placement="bottom">
        <ElButton text circle :aria-label="t('ui.appSettings')" @click="openSettings">
          <ElIcon :size="18">
            <Setting />
          </ElIcon>
        </ElButton>
      </ElTooltip>
    </div>

    <AppLockScreen ref="lockScreen" />
    <AppSettings v-model="settingsVisible" />
    <AppMenuSearch v-if="searchMounted" v-model="searchVisible" />
  </header>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
