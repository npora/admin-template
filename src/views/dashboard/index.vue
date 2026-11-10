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
.starter-home {
  padding: clamp(20px, 4vw, 48px);
  max-width: 1280px;
  margin: 0 auto;
  &__welcome {
    padding: clamp(24px, 4vw, 48px);
    border: 1px solid var(--np-primary-border);
    border-radius: var(--np-radius-large);
    background: linear-gradient(120deg, var(--np-bg-container), var(--np-primary-soft));
    h1 {
      margin: 18px 0 12px;
      font-size: clamp(24px, 3vw, 36px);
      line-height: 1.4;
    }
    p {
      color: var(--np-text-regular);
      line-height: 1.8;
    }
  }
  &__brand {
    color: var(--np-color-primary);
    font-weight: 600;
  }
  &__entries {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 24px;
  }
  &__entry {
    display: flex;
    gap: 18px;
    align-items: center;
    padding: 28px;
    text-align: left;
    border: 1px solid var(--np-border-color-light);
    border-radius: var(--np-radius-medium);
    background: var(--np-bg-container);
    color: var(--np-text-primary);
    cursor: pointer;
    transition:
      border-color 180ms,
      background-color 180ms;
    &:hover,
    &:focus-visible {
      border-color: var(--np-color-primary);
      background: var(--np-bg-subtle);
    }
    span {
      flex: 1;
    }
    strong,
    small {
      display: block;
    }
    strong {
      font-size: 16px;
    }
    small {
      margin-top: 8px;
      color: var(--np-text-secondary);
      line-height: 1.6;
    }
  }
  &__icon {
    padding: 14px;
    border-radius: 12px;
    background: var(--np-primary-soft);
    color: var(--np-color-primary);
    font-size: 24px;
    box-sizing: content-box;
  }
}
@media (max-width: 767px) {
  .starter-home__entries {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .starter-home__entry {
    transition: none;
  }
}
</style>
