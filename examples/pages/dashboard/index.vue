<script setup lang="ts">
import DataTable from '@/components/DataTable/index.vue'
import { useI18n } from 'vue-i18n'

import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissionStore } from '@/store/modules/permission'
import {
  ArrowRight,
  Calendar,
  CircleCheck,
  Connection,
  Grid,
  Lock,
  OfficeBuilding,
  Refresh,
  Setting,
  User,
  UserFilled
} from '@element-plus/icons-vue'
import { formatDate, formatNumber, formatList } from '@/locales'
import type { ManagedUser } from '@/api/types/user'
import { appConfig } from '@/config/app'
import { useUserStore } from '@/store/modules/user'
import { usePermission } from '@/composables/usePermission'
import { useDashboard } from './useDashboard'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter(),
  user = useUserStore()
const { hasPermission } = usePermission()
const { overview, loading, failed, load } = useDashboard()
const permissionStore = usePermissionStore()
const date = new Date()
const dateLabel = computed(() => formatDate(date, 'heading'))
const greeting = computed(() =>
  date.getHours() < 6
    ? t('ui.workingLate')
    : date.getHours() < 12
      ? t('ui.goodMorning')
      : date.getHours() < 18
        ? t('ui.goodAfternoon')
        : t('ui.goodEvening')
)
const shortcuts = computed(() =>
  [
    {
      key: 'users' as const,
      title: t('ui.userManagement'),
      description: t('ui.manageAccountsAndProfiles'),
      path: '/system/user',
      icon: User,
      tone: 'blue',
      permission: 'system:user:list'
    },
    {
      key: 'roles' as const,
      title: t('ui.rolePermissions'),
      description: t('ui.assignRolesAndPermissions'),
      path: '/system/role',
      icon: Lock,
      tone: 'purple',
      permission: 'system:role:list'
    },
    {
      key: 'departments' as const,
      title: t('ui.departmentManagement'),
      description: t('ui.organizeDepartmentsAndTeams'),
      path: '/system/department',
      icon: OfficeBuilding,
      tone: 'teal',
      permission: 'system:department:list'
    },
    {
      key: 'menus' as const,
      title: t('ui.menuConfiguration'),
      description: t('ui.managePagesAndNavigation'),
      path: '/system/menu',
      icon: Grid,
      tone: 'amber',
      permission: 'system:menu:list'
    }
  ].filter((item) =>
    overview.value ? overview.value.capabilities[item.key] : hasPermission(item.permission)
  )
)
const metrics = computed(() => {
  const data = overview.value
  const cards = []
  if (data?.capabilities.users ?? hasPermission('system:user:list'))
    cards.push({
      key: 'users',
      label: t('ui.totalUsers'),
      value: data?.users?.total,
      unit: t('ui.metricUserUnit'),
      description: data?.users
        ? t('ui.userStatusCounts', { value: data.users.enabled, value1: data.users.disabled })
        : t('ui.userAccountsInYourOrganization'),
      icon: User,
      tone: 'blue'
    })
  if (data?.capabilities.roles ?? hasPermission('system:role:list'))
    cards.push({
      key: 'roles',
      label: t('ui.totalRoles'),
      value: data?.roles?.total,
      unit: t('ui.metricItemUnit'),
      description: data?.roles
        ? t('ui.enabledRoleCount', { value: data.roles.enabled })
        : t('ui.controlAccessByResponsibility'),
      icon: Lock,
      tone: 'purple'
    })
  if (data?.capabilities.departments ?? hasPermission('system:department:list'))
    cards.push({
      key: 'departments',
      label: t('ui.departments'),
      value: data?.departments?.total,
      unit: t('ui.metricItemUnit'),
      description: data?.departments
        ? t('ui.enabledDepartmentCount', { value: data.departments.enabled })
        : t('ui.aClearOrganizationalStructure'),
      icon: OfficeBuilding,
      tone: 'teal'
    })
  cards.push({
    key: 'pages',
    label: t('ui.accessiblePages'),
    value: data ? permissionStore.accessiblePageCount : undefined,
    unit: t('ui.metricItemUnit'),
    description: t('ui.basedOnYourAccountPermissions'),
    icon: Grid,
    tone: 'amber'
  })
  return cards
})
const distribution = computed(() => {
  const groups = overview.value?.users?.departments ?? []
  return groups.slice(0, 5).map((group, index) => ({
    ...group,
    percent: overview.value?.users?.total
      ? Math.round((group.count / overview.value.users.total) * 100)
      : 0,
    tone: ['blue', 'teal', 'purple', 'amber', 'slate'][index]
  }))
})
const enabledPercent = computed(() =>
  overview.value?.users?.total
    ? Math.round((overview.value.users.enabled / overview.value.users.total) * 100)
    : 0
)
onMounted(() => {
  void load()
})
</script>

<template>
  <section class="dashboard">
    <div class="dashboard__heading">
      <div>
        <span class="page-eyebrow">OVERVIEW</span>
        <h1>{{ t('ui.workspace') }}</h1>
        <p>{{ t('ui.startWithAnOverviewKeepEverydayManagementOrganized') }}</p>
      </div>
      <div class="dashboard__date">
        <ElIcon><Calendar /></ElIcon>{{ dateLabel }}
      </div>
    </div>
    <div class="welcome-panel">
      <div class="welcome-panel__content">
        <span class="welcome-panel__eyebrow"
          ><i />{{ t('ui.welcomeTo', { value: appConfig.title }) }}</span
        >
        <h2>
          {{ t('ui.greetingWithName', { value: greeting, value1: user.displayName })
          }}<span class="welcome-panel__punctuation">{{ t('ui.sentenceEnd') }}</span>
        </h2>
        <p>
          {{ t('ui.yourTeamAccountsAndPermissionsInOnePlace') }}<br />{{
            t('ui.startYourDayWithTheToolsYouKnow')
          }}
        </p>
        <div class="welcome-panel__actions">
          <ElButton v-if="shortcuts[0]" type="primary" @click="router.push(shortcuts[0].path)"
            >{{ t('ui.getStarted') }}<ElIcon class="button-arrow"><ArrowRight /></ElIcon></ElButton
          ><ElButton :icon="Refresh" :loading="loading" @click="load">{{
            t('ui.refreshOverview')
          }}</ElButton>
        </div>
      </div>
      <div class="welcome-panel__workspace" :aria-label="t('ui.currentWorkspace')">
        <div class="workspace-card">
          <div class="workspace-card__top">
            <span class="workspace-card__symbol"
              ><ElIcon><Connection /></ElIcon></span
            ><span class="workspace-card__status"><i />{{ t('ui.signedIn') }}</span>
          </div>
          <span class="workspace-card__label">{{ t('ui.currentWorkspace') }}</span><strong>{{
            appConfig.title
          }}</strong>
          <div class="workspace-card__account">
            <ElAvatar :size="36">{{ user.displayName.charAt(0) }}</ElAvatar>
            <div>
              <b>{{
                (overview?.account.isSuperAdmin ?? user.userInfo?.isSuperAdmin)
                  ? t('ui.superAdministrator')
                  : formatList(overview?.account.roleNames ?? []) || t('ui.authorizedAccount')
              }}</b><span>{{
                overview?.account.departmentName || t('ui.everydayManagementOrganized')
              }}</span>
            </div>
          </div>
        </div>
        <span class="welcome-panel__orb welcome-panel__orb--one" /><span
          class="welcome-panel__orb welcome-panel__orb--two"
        />
      </div>
    </div>

    <ElAlert
      v-if="failed"
      :title="
        overview
          ? t('ui.refreshFailedShowingTheLastLoadedOverview')
          : t('ui.overviewUnavailableRefreshToTryAgain')
      "
      type="error"
      :closable="false"
      show-icon
      class="dashboard__error"
    />
    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.key" class="metric-card">
        <div class="metric-card__top">
          <span>{{ metric.label }}</span><span class="tone-icon" :class="`tone-${metric.tone}`"
            ><ElIcon><component :is="metric.icon" /></ElIcon
          ></span>
        </div>
        <div class="metric-card__value">
          <ElSkeleton v-if="loading && !overview" :rows="0" animated /><template v-else
            >{{ metric.value === undefined ? '—' : formatNumber(metric.value)
            }}<span v-if="metric.unit">{{ metric.unit }}</span></template
          >
        </div>
        <p>{{ metric.description }}</p>
      </article>
    </div>

    <div class="dashboard-grid">
      <section
        v-if="overview?.capabilities.users || (!overview && hasPermission('system:user:list'))"
        class="dashboard-panel dashboard-panel--users"
      >
        <header class="dashboard-panel__heading">
          <div>
            <span class="section-kicker">{{ t('ui.memberOverview') }}</span>
            <h2>{{ t('ui.recentlyAddedUsers') }}</h2>
          </div>
          <ElButton text type="primary" @click="router.push('/system/user')"
            >{{ t('ui.viewAll') }}<ElIcon class="button-arrow"><ArrowRight /></ElIcon
          ></ElButton>
        </header>
        <div class="user-health">
          <span class="user-health__icon"
            ><ElIcon><CircleCheck /></ElIcon
          ></span>
          <div>
            <strong>{{ t('ui.accountAvailability') }}</strong><span>{{
              overview?.users
                ? t('ui.usersCanSignIn', { value: overview.users.enabled }, overview.users.enabled)
                : t('ui.loadingAccountStatus')
            }}</span>
          </div>
          <b>{{ overview?.users ? `${enabledPercent}%` : '—' }}</b>
        </div>
        <div class="user-health__track"><span :style="{ width: `${enabledPercent}%` }" /></div>
        <DataTable
          :loading="loading && !overview"
          :data="overview?.users?.recent ?? []"
          class="dashboard-users"
          ><!-- @vue-generic {ManagedUser} --><ElTableColumn :label="t('ui.user')" min-width="190"
            ><template #default="{ row }"
              ><div class="dashboard-users__person">
                <ElAvatar :size="36">{{ row.displayName.charAt(0) }}</ElAvatar>
                <div>
                  <strong>{{ row.displayName }}</strong><span>{{ row.username }}</span>
                </div>
              </div></template
            ></ElTableColumn
          ><ElTableColumn
            prop="departmentName"
            :label="t('ui.department')"
            min-width="110" /><!-- @vue-generic {ManagedUser} --><ElTableColumn
            :label="t('ui.status')"
            width="92"
            ><template #default="{ row }"
              ><span class="status-pill" :class="{ 'is-disabled': row.status === 0 }"
                ><i />{{ row.status === 1 ? t('ui.enabled') : t('ui.disabled') }}</span
              ></template
            ></ElTableColumn
          ><!-- @vue-generic {ManagedUser} --><ElTableColumn
            :label="t('ui.createdAt')"
            min-width="112"
            ><template #default="{ row }"
              ><span class="dashboard-users__date">{{
                formatDate(row.createdAt, 'short')
              }}</span></template
            ></ElTableColumn
          ><template #empty
            ><ElEmpty
              :description="failed ? t('ui.overviewUnavailable') : t('ui.noUserRecordsYet')"
              :image-size="70" /></template
        ></DataTable>
        <footer class="dashboard-panel__footer">
          <i /><span>{{
            overview
              ? t('ui.updatedAtSortedByCreationTime', {
                  value: formatDate(overview.generatedAt, 'time')
                })
              : t('ui.onlyDataAvailableToYourAccountIsShown')
          }}</span>
        </footer>
      </section>
      <section v-else class="dashboard-panel dashboard-panel--users account-overview">
        <span class="tone-icon tone-blue"
          ><ElIcon><UserFilled /></ElIcon
        ></span>
        <h2>{{ t('ui.hello', { value: user.displayName }) }}</h2>
        <p>{{ t('ui.userListAccessHint') }}</p>
        <div class="account-overview__roles">
          <ElTag v-for="role in overview?.account.roleNames ?? []" :key="role" effect="plain">{{
            role
          }}</ElTag>
        </div>
        <small>{{ t('ui.afterRoleChangesRefreshPermissionsFromTheUserMenu') }}</small>
      </section>
      <section class="dashboard-panel dashboard-panel--quick">
        <header class="dashboard-panel__heading">
          <div>
            <span class="section-kicker">{{ t('ui.commonTools') }}</span>
            <h2>{{ t('ui.quickAccess') }}</h2>
          </div>
          <span class="dashboard-panel__caption">{{
            t('ui.shortcuts', { value: shortcuts.length })
          }}</span>
        </header>
        <div v-if="shortcuts.length" class="shortcut-grid">
          <button
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
            type="button"
            class="shortcut"
            @click="router.push(shortcut.path)"
          >
            <span class="tone-icon" :class="`tone-${shortcut.tone}`"
              ><ElIcon><component :is="shortcut.icon" /></ElIcon></span
            ><strong>{{ shortcut.title }}</strong
            ><span>{{ shortcut.description }}</span
            ><ElIcon class="shortcut__arrow"><ArrowRight /></ElIcon>
          </button>
        </div>
        <ElEmpty v-else :description="t('ui.noManagementShortcutsAvailable')" :image-size="65" />
      </section>
      <section v-if="overview?.users" class="dashboard-panel dashboard-panel--distribution">
        <header class="dashboard-panel__heading">
          <div>
            <span class="section-kicker">{{ t('ui.organization') }}</span>
            <h2>{{ t('ui.usersByDepartment') }}</h2>
          </div>
          <span class="distribution-total"
            >{{ overview.users.total
            }}<small>{{ t('ui.userCountUnit', overview.users.total) }}</small></span
          >
        </header>
        <div v-if="distribution.length" class="distribution-list">
          <div v-for="group in distribution" :key="group.id ?? 'none'" class="distribution-item">
            <div>
              <span
                ><i :class="`dot-${group.tone}`" />{{
                  group.id === null ? t('ui.unassignedDepartment') : group.name
                }}</span
              ><b
                >{{ group.count }}<small>{{ t('ui.userUnit', group.count) }}</small></b
              >
            </div>
            <div class="distribution-item__track">
              <span :class="`bar-${group.tone}`" :style="{ width: `${group.percent}%` }" />
            </div>
          </div>
        </div>
        <ElEmpty v-else :description="t('ui.noDepartmentDistributionData')" :image-size="60" />
        <p class="distribution-note">
          {{ t('ui.basedOnAssignedDepartmentsShowingTheFiveLargestGroups') }}
        </p>
      </section>
      <section v-else class="dashboard-panel dashboard-panel--distribution">
        <header class="dashboard-panel__heading">
          <div>
            <span class="section-kicker">{{ t('ui.workspaceTips') }}</span>
            <h2>{{ t('ui.clearPermissionsOrganizedTeamwork') }}</h2>
          </div>
          <ElIcon class="dashboard-panel__muted-icon"><Lock /></ElIcon>
        </header>
        <p class="dashboard-tip">{{ t('ui.accessHelp') }}</p>
      </section>
    </div>
    <footer class="dashboard__footer">
      <span>{{ t('ui.workspaceFooter', { value: appConfig.title }) }}</span><span
        ><ElIcon><Setting /></ElIcon>{{ t('ui.adjustYourPreferencesInTheSettingsMenu') }}</span
      >
    </footer>
  </section>
</template>
<style scoped lang="scss">
@use './index.scss';
</style>
