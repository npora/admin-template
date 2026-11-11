import { readonly, ref } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'

const states = new WeakMap<Router, ReturnType<typeof createState>>()

function createState() {
  return { loading: ref(false), stop: undefined as (() => void) | undefined }
}

export function useNavigationLoading(router: Router) {
  let state = states.get(router)
  if (!state) {
    state = createState()
    states.set(router, state)
  }
  return readonly(state.loading)
}

/** Only mask content for slow navigation inside the mounted admin layout. */
export function setupNavigationLoading(router: Router): () => void {
  useNavigationLoading(router)
  const state = states.get(router)!
  state.stop?.()
  let pending: RouteLocationNormalized | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const clear = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
    state.loading.value = false
  }
  const finish = (to: RouteLocationNormalized) => {
    // A cancelled older navigation must not hide a newer navigation's loader.
    if (pending === to) clear()
  }
  const stopBefore = router.beforeEach((to, from) => {
    clearTimeout(timer)
    pending = to
    const insideLayout = [to, from].every((route) =>
      route.matched.some((record) => record.name === 'Layout')
    )
    if (!insideLayout) {
      clear()
      return
    }
    timer = setTimeout(() => {
      if (pending === to) state.loading.value = true
    }, 120)
  })
  const stopAfter = router.afterEach((to) => finish(to))
  const stopError = router.onError((_error, to) => finish(to))
  const stop = () => {
    clear()
    stopBefore()
    stopAfter()
    stopError()
    if (state.stop === stop) state.stop = undefined
  }
  state.stop = stop
  return stop
}
