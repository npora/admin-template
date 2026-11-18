const CHECK_INTERVAL = 60_000

export async function registerPwaUpdates(
  url: URL,
  confirmUpdate: () => Promise<boolean>,
  reload: () => void
): Promise<void> {
  if (!('serviceWorker' in navigator) || url.origin !== window.location.origin) return
  const serviceWorker = navigator.serviceWorker
  let pageController = serviceWorker.controller
  const registration = await serviceWorker.register(url, { updateViaCache: 'none' })
  const prompted = new WeakSet<ServiceWorker>()
  let confirming = false
  let waitingForControl = false
  let reloading = false
  let checking = false

  function reloadOnce() {
    if (reloading) return
    reloading = true
    reload()
  }

  async function promptUpdate(worker: ServiceWorker) {
    if (reloading || waitingForControl || confirming || prompted.has(worker)) return
    prompted.add(worker)
    confirming = true
    try {
      if (!(await confirmUpdate())) return
      const nextWorker = registration.waiting
      if (!nextWorker) {
        reloadOnce()
        return
      }
      waitingForControl = true
      nextWorker.postMessage('SKIP_WAITING')
    } finally {
      confirming = false
    }
  }

  function detectUpdate() {
    if (registration.active && registration.waiting) {
      void promptUpdate(registration.waiting)
    } else if (
      pageController &&
      serviceWorker.controller &&
      serviceWorker.controller !== pageController
    ) {
      void promptUpdate(serviceWorker.controller)
    }
  }

  function controllerChanged() {
    const controller = serviceWorker.controller
    if (!controller) return
    if (waitingForControl) {
      reloadOnce()
      return
    }
    // 首次安装只记录接管页面的 Worker，之后其他标签页激活新版也需要确认。
    if (!pageController) pageController = controller
    detectUpdate()
  }

  function observeInstallingWorker() {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', function stateChanged() {
      if (installing.state === 'installed') detectUpdate()
      if (installing.state === 'installed' || installing.state === 'redundant') {
        installing.removeEventListener('statechange', stateChanged)
      }
    })
  }

  async function check() {
    if (checking || document.visibilityState === 'hidden') return
    detectUpdate()
    checking = true
    try {
      await registration.update()
      detectUpdate()
    } catch {
      // 临时断网时保留当前页面，下次回到页面或轮询时重试。
    } finally {
      checking = false
    }
  }

  serviceWorker.addEventListener('controllerchange', controllerChanged)
  registration.addEventListener('updatefound', observeInstallingWorker)
  observeInstallingWorker()
  controllerChanged()
  detectUpdate()
  document.addEventListener('visibilitychange', check)
  window.setInterval(check, CHECK_INTERVAL)
}
