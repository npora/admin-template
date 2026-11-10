import { effectScope, shallowRef, watchEffect, type Directive } from 'vue'

import { pinia } from '@/store'
import { usePermissionStore } from '@/store/modules/permission'
import { checkPermission, type PermissionMode, type PermissionValue } from '@/utils/permission'

interface PermissionState {
  stop: () => void
  update: (value: PermissionValue, mode: PermissionMode) => void
}
const states = new WeakMap<HTMLElement, PermissionState>()

export const permission: Directive<HTMLElement, PermissionValue> = {
  beforeMount(el, binding) {
    const store = usePermissionStore(pinia)
    const display = el.style.display
    const value = shallowRef(binding.value)
    const mode = shallowRef<PermissionMode>(binding.modifiers.all ? 'all' : 'any')
    const scope = effectScope(true)
    scope.run(() =>
      watchEffect(() => {
        el.style.display =
          store.ready && checkPermission(store.permissions, value.value, mode.value)
            ? display
            : 'none'
      })
    )
    states.set(el, {
      stop: () => scope.stop(),
      update: (nextValue, nextMode) => {
        value.value = nextValue
        mode.value = nextMode
      }
    })
  },
  updated(el, binding) {
    states.get(el)?.update(binding.value, binding.modifiers.all ? 'all' : 'any')
  },
  beforeUnmount(el) {
    states.get(el)?.stop()
    states.delete(el)
  }
}
