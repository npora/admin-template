<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Lock, OfficeBuilding, Setting, ArrowRight } from '@element-plus/icons-vue'
import { appConfig } from '@/config/app'
import { useUserStore } from '@/store/modules/user'
import { usePermission } from '@/composables/usePermission'

const { t } = useI18n()
const router = useRouter()
const user = useUserStore()
const { hasPermission } = usePermission()
const entries = computed(() =>
  [
    {
      path: '/system/user',
      title: t('ui.userManagement'),
      description: t('ui.manageAccountsAndProfiles'),
      permission: 'system:user:list',
      icon: User
    },
    {
      path: '/system/department',
      title: t('ui.departmentManagement'),
      description: t('ui.organizeDepartmentsAndTeams'),
      permission: 'system:department:list',
      icon: OfficeBuilding
    },
    {
      path: '/system/role',
      title: t('ui.rolePermissions'),
      description: t('ui.assignRolesAndPermissions'),
      permission: 'system:role:list',
      icon: Lock
    },
    {
      path: '/system/menu',
      title: t('ui.menuConfiguration'),
      description: t('ui.managePagesAndNavigation'),
      permission: 'system:menu:list',
      icon: Setting
    }
  ].filter(
    (entry) =>
      hasPermission(entry.permission) && router.resolve(entry.path).name !== 'RouteFallback'
  )
)
</script>

<template>
  <section class="starter-home">
    <header class="starter-home__welcome">
      <span class="starter-home__brand">{{ appConfig.title }}</span>
      <h1>{{ t('ui.welcomeBack') }} · {{ user.displayName }}</h1>
      <p>{{ t('ui.aLightweightModernAndExtensibleVue3AdminStarter') }}</p>
    </header>
    <div class="starter-home__entries">
      <button
        v-for="entry in entries"
        :key="entry.path"
        type="button"
        class="starter-home__entry"
        @click="router.push(entry.path)"
      >
        <ElIcon class="starter-home__icon"><component :is="entry.icon" /></ElIcon>
        <span
          ><strong>{{ entry.title }}</strong
          ><small>{{ entry.description }}</small></span
        >
        <ElIcon><ArrowRight /></ElIcon>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
