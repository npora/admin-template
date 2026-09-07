import {
  effectScope,
  watchEffect,
  type Directive,
  type DirectiveBinding,
  type EffectScope
} from 'vue'

import { pinia } from '@/store'
import { usePermissionStore } from '@/store/modules/permission'
import {
  checkPermission,
  type PermissionMode,
  type PermissionValue
} from '@/utils/permission'

interface PermissionElement extends HTMLElement {
  __npPermissionScope__?: EffectScope
  __npPermissionDisplay__?: string
}

function resolveMode(
  binding: DirectiveBinding<PermissionValue>
): PermissionMode {
  return binding.modifiers.all
    ? 'all'
    : 'any'
}

function setupPermission(
  el: PermissionElement,
  binding: DirectiveBinding<PermissionValue>
): void {
  el.__npPermissionScope__?.stop()

  if (el.__npPermissionDisplay__ === undefined) {
    el.__npPermissionDisplay__ = el.style.display
  }

  const permissionStore =
    usePermissionStore(pinia)

  const scope = effectScope()

  scope.run(() => {
    watchEffect(() => {
      if (!permissionStore.ready) {
        el.style.display = 'none'
        return
      }

      const allowed = checkPermission(
        permissionStore.permissions,
        binding.value,
        resolveMode(binding)
      )

      el.style.display = allowed
        ? el.__npPermissionDisplay__ ?? ''
        : 'none'
    })
  })

  el.__npPermissionScope__ = scope
}

function cleanupPermission(
  el: PermissionElement
): void {
  el.__npPermissionScope__?.stop()

  delete el.__npPermissionScope__
  delete el.__npPermissionDisplay__
}

export const permission: Directive<
  PermissionElement,
  PermissionValue
> = {
  mounted(el, binding) {
    setupPermission(el, binding)
  },

  updated(el, binding) {
    setupPermission(el, binding)
  },

  beforeUnmount(el) {
    cleanupPermission(el)
  }
}