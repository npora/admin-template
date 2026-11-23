import { onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTokenVersion } from '@/api/auth/token-storage'
import { handleRequestError } from '@/api/errors/handling'
import { resetUserPassword } from '@/api/modules/user'
import type { ManagedUser } from '@/api/types/user'
import { useSession } from '@/composables/useSession'
import { useUserStore } from '@/store/modules/user'

export function useResetUserPassword() {
  const { t } = useI18n({ useScope: 'global' })
  const currentUser = useUserStore()
  const session = useSession()
  const resettingPassword = ref(false)
  let resetController: AbortController | undefined
  let disposed = false
  onScopeDispose(() => {
    disposed = true
    resetController?.abort()
  })

  async function resetPassword(user: ManagedUser) {
    if (resettingPassword.value || !currentUser.userInfo?.isSuperAdmin) return
    resettingPassword.value = true
    const version = getTokenVersion()
    const active = () => !disposed && version === getTokenVersion()
    try {
      const current = await ElMessageBox.prompt(
        t('ui.administratorPasswordHint'),
        t('ui.resetPassword'),
        {
          inputType: 'password',
          inputValidator: (value) =>
            Boolean(value && value.length <= 128) || t('ui.enterYourPassword'),
          confirmButtonText: t('ui.gotIt'),
          cancelButtonText: t('ui.cancel')
        }
      )
      if (!active()) return
      const next = await ElMessageBox.prompt(
        t('ui.newPasswordHint', { account: user.username }),
        t('ui.resetPassword'),
        {
          inputType: 'password',
          inputValidator: (value) =>
            Boolean(value && value.length >= 6 && value.length <= 128) ||
            t('ui.passwordMustContain6128Characters'),
          confirmButtonText: t('ui.resetPassword'),
          cancelButtonText: t('ui.cancel')
        }
      )
      if (!active()) return
      resetController = new AbortController()
      await resetUserPassword(user.id, current.value, next.value, resetController.signal)
      if (!active()) return
      ElMessage.success(t('ui.passwordResetSuccess'))
      if (currentUser.userInfo?.id === user.id) await session.logout()
    } catch (error) {
      if (active() && error !== 'cancel' && error !== 'close') handleRequestError(error)
    } finally {
      resetController = undefined
      resettingPassword.value = false
    }
  }

  return { resettingPassword, resetPassword }
}
