// Inlined into HTML before the module entry, so even a failed bundle can show retry.
;(() => {
  const root = document.getElementById('app-loading')
  if (!root || window.__APP_STARTUP__) return
  const message = document.getElementById('app-loading-message')
  const retry = document.getElementById('app-loading-retry')
  let copy = {
    loading: '正在加载',
    slow: '加载时间较长，请稍候或重试',
    failed: '页面加载失败，请重新加载',
    retry: '重新加载'
  }
  let state = 'loading'
  let disposed = false
  let fadeTimer
  // Restore the theme before Vue/CSS dependencies arrive; storage denial is harmless.
  try {
    const saved = JSON.parse(localStorage.getItem(root.dataset.settingsKey) || 'null')
    const mode = saved?.theme?.mode
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
    document.documentElement.classList.toggle(
      'dark',
      mode === 'dark' || (mode !== 'light' && systemDark)
    )
  } catch {
    document.documentElement.classList.toggle(
      'dark',
      window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
    )
  }
  const render = () => {
    message.textContent = copy[state]
    retry.textContent = copy.retry
    retry.hidden = state === 'loading'
  }
  const reload = () => window.location.reload()
  const fail = () => {
    if (disposed || state === 'done') return
    state = 'failed'
    root.classList.add('is-failed')
    root.setAttribute('role', 'alert')
    root.setAttribute('aria-live', 'assertive')
    render()
  }
  const resourceError = (event) => {
    const tag = event.target?.tagName
    if (tag === 'SCRIPT' || (tag === 'LINK' && event.target.rel === 'stylesheet') || event.error)
      fail()
  }
  const watchdog = window.setTimeout(() => {
    if (state !== 'loading') return
    state = 'slow'
    render()
  }, 15000)
  const remove = () => {
    if (disposed) return
    disposed = true
    window.clearTimeout(watchdog)
    window.clearTimeout(fadeTimer)
    window.removeEventListener('error', resourceError, true)
    window.removeEventListener('unhandledrejection', fail)
    retry.removeEventListener('click', reload)
    root.removeEventListener('transitionend', transitionEnd)
    root.remove()
    document.getElementById('app-loading-style')?.remove()
    if (window.__APP_STARTUP__ === controller) delete window.__APP_STARTUP__
  }
  const transitionEnd = (event) => {
    if (event.target === root && event.propertyName === 'opacity') remove()
  }
  const controller = {
    setMessages(messages) {
      if (disposed || state === 'done') return
      copy = { ...copy, ...messages }
      render()
    },
    complete() {
      if (disposed || state === 'done' || state === 'failed') return
      state = 'done'
      window.clearTimeout(watchdog)
      document.getElementById('app')?.removeAttribute('inert')
      document.getElementById('app')?.removeAttribute('aria-busy')
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return remove()
      root.addEventListener('transitionend', transitionEnd)
      root.classList.add('is-leaving')
      fadeTimer = window.setTimeout(remove, 250)
    },
    fail
  }
  retry.addEventListener('click', reload)
  window.addEventListener('error', resourceError, true)
  window.addEventListener('unhandledrejection', fail)
  window.__APP_STARTUP__ = controller
})()
