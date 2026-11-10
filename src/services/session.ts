import type { Router } from 'vue-router'
import { t } from '@/locales'

import { getUserInfo, login, revokeSession } from '@/api/modules/auth'
import { getDynamicRoutes } from '@/api/modules/route'
import type { LoginRequest } from '@/api/types/auth'
import { getTokenVersion, tokenStorage } from '@/api/auth/token-storage'
import { transformDynamicRoutes } from '@/router/utils/dynamic-route'
import { registerDynamicRoutes } from '@/router/utils/register-routes'
import { pinia } from '@/store'
import { usePermissionStore } from '@/store/modules/permission'
import { useTabsStore } from '@/store/modules/tabs'
import { useUserStore } from '@/store/modules/user'

const sessions = new WeakMap<Router, ReturnType<typeof createSession>>()

/** 会话服务可直接用于守卫和启动流程，无需 Vue 组件上下文。 */
export function getSession(router: Router) {
  let session = sessions.get(router)
  if (!session) {
    session = createSession(router)
    sessions.set(router, session)
  }
  return session
}

function createSession(router: Router) {
  let refreshPromise: Promise<boolean> | undefined
  let initializePromise: Promise<boolean> | undefined
  let removeRoutes: (() => void) | undefined
  let sessionVersion = 0
  let restoredToken: string | undefined
  let restoredTokenVersion: number | undefined
  let initializingTokenVersion: number | undefined
  const userStore = useUserStore(pinia)
  const permissionStore = usePermissionStore(pinia)
  const tabsStore = useTabsStore(pinia)

  function resetState(): void {
    sessionVersion += 1
    initializePromise = undefined
    removeRoutes?.()
    removeRoutes = undefined
    restoredToken = undefined
    restoredTokenVersion = undefined
    initializingTokenVersion = undefined
    userStore.reset()
    permissionStore.reset()
    tabsStore.clear()
  }

  function clearSession(): void {
    resetState()
    tokenStorage.remove()
  }

  async function restoreSession(
    token: string,
    version: number,
    tokenVersion: number
  ): Promise<boolean> {
    try {
      const [user, routeData] = await Promise.all([getUserInfo(), getDynamicRoutes()])

      // 退出或切换账号后，不允许旧请求恢复已清理的会话。
      if (
        version !== sessionVersion ||
        tokenStorage.get() !== token ||
        getTokenVersion() !== tokenVersion
      ) {
        return false
      }

      const routes = transformDynamicRoutes(routeData)
      removeRoutes = registerDynamicRoutes(router, routes)
      permissionStore.setRoutes(routes)
      userStore.setUser(user)
      permissionStore.setRoles(user.roles)
      permissionStore.setPermissions(user.permissions)
      restoredToken = token
      restoredTokenVersion = tokenVersion
      permissionStore.setReady(true)
      return true
    } catch (error) {
      if (
        version === sessionVersion &&
        tokenStorage.get() === token &&
        getTokenVersion() === tokenVersion
      ) {
        clearSession()
      }
      throw error
    }
  }

  function initialize(): Promise<boolean> {
    const token = tokenStorage.get()
    if (!token) {
      clearSession()
      return Promise.resolve(false)
    }
    const tokenVersion = getTokenVersion()
    if (
      restoredToken === token &&
      restoredTokenVersion === tokenVersion &&
      permissionStore.ready &&
      userStore.hasUserInfo
    ) {
      return Promise.resolve(true)
    }
    if (
      (restoredToken && (restoredToken !== token || restoredTokenVersion !== tokenVersion)) ||
      (initializePromise && initializingTokenVersion !== tokenVersion)
    )
      resetState()
    if (initializePromise) return initializePromise

    initializingTokenVersion = tokenVersion
    const pending = restoreSession(token, sessionVersion, tokenVersion).finally(() => {
      if (initializePromise === pending) {
        initializePromise = undefined
        initializingTokenVersion = undefined
      }
    })
    initializePromise = pending
    return pending
  }

  async function signIn(credentials: LoginRequest): Promise<void> {
    clearSession()
    const version = sessionVersion
    const result = await login(credentials)
    if (version !== sessionVersion) throw new Error(t('ui.signInCancelled'))

    tokenStorage.set(result.accessToken)
    if (!(await initialize())) throw new Error(t('ui.signInCancelled'))
  }

  function refreshAuthorization(): Promise<boolean> {
    if (refreshPromise) return refreshPromise
    const task = (async () => {
      const token = tokenStorage.get()
      if (!token) {
        await router.replace('/login')
        return false
      }
      const previous = router.currentRoute.value.fullPath
      resetState()
      tokenStorage.set(token)
      try {
        if (!(await initialize())) return false
        const resolved = router.resolve(previous)
        await router.replace(
          resolved.name === 'RouteFallback' || resolved.meta.public ? '/dashboard' : previous
        )
        return true
      } catch (error) {
        if (!tokenStorage.get() && router.currentRoute.value.path !== '/login')
          await router.replace({ path: '/login', query: { redirect: previous } })
        throw error
      }
    })().finally(() => {
      if (refreshPromise === task) refreshPromise = undefined
    })
    refreshPromise = task
    return task
  }

  async function logout(): Promise<void> {
    const token = tokenStorage.get()
    // 立即清理本地状态；旧 Token 的撤销失败不阻止离线退出，也不清理后来登录的新会话。
    const revocation = token ? revokeSession(token).catch(() => undefined) : Promise.resolve()
    clearSession()
    await router.replace('/login')
    await revocation
  }

  return { initialize, signIn, clearSession, logout, refreshAuthorization }
}
