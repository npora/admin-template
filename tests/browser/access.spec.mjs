import { expect } from '@playwright/test'
import { test } from './fixtures.mjs'
import { contextOptions } from './playwright.config.mjs'

async function localPage(context, { origin }) {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  )
  return context.newPage()
}

async function signIn(page, { origin }, credentials, target = '/dashboard') {
  await page.goto(origin + target)
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  await page.getByPlaceholder('用户名', { exact: true }).fill(credentials.username)
  try {
    await page.getByPlaceholder('密码', { exact: true }).fill(credentials.password, {
      timeout: 10_000
    })
    const [session] = await Promise.all([
      page.waitForRequest((request) => new URL(request.url()).pathname === '/api/auth/session', {
        timeout: 10_000
      }),
      page.getByRole('button', { name: '登录', exact: true }).click({ timeout: 10_000 })
    ])
    await page.waitForURL(origin + target, { timeout: 10_000 })
    return await session.headerValue('authorization')
  } catch {
    // Close the page before Playwright captures a failure snapshot of the login form.
    await page.close().catch(() => {})
    throw new Error('Could not complete the browser fixture login')
  }
}

async function expandSystemMenu(page) {
  const menu = page.getByRole('menuitem', { name: '系统管理', exact: true })
  await expect(menu).toBeVisible()
  if ((await menu.getAttribute('aria-expanded')) !== 'true')
    await menu.getByText('系统管理', { exact: true }).click()
  await expect(page.getByRole('menuitem', { name: '用户管理', exact: true })).toBeVisible()
}

async function apiStatus(page, { origin }, path, authorization) {
  if (!authorization) throw new Error('The browser did not send session authorization')
  try {
    const response = await page.request.get(`${origin}/api${path}`, {
      headers: { authorization },
      timeout: 10_000
    })
    return response.status()
  } catch {
    throw new Error(`The browser test API request to ${path} failed`)
  }
}

test('login shows Retry-After and blocks submission until the countdown ends', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  let attempts = 0
  await page.route(`${app.origin}/api/auth/login`, async (route) => {
    attempts++
    if (attempts !== 1) return route.continue()
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '3' },
      json: { code: 429, message: 'Fixture rate limit', data: null }
    })
  })
  await page.goto(`${app.origin}/login`)
  await page.getByPlaceholder('用户名', { exact: true }).fill(app.admin.username)
  const password = page.getByPlaceholder('密码', { exact: true })
  const button = page.getByRole('button', { name: '登录', exact: true })
  const timer = page.getByRole('timer')
  let stage = 'submitting the fixture login'
  try {
    await password.fill(app.admin.password)
    await button.click()
    stage = 'displaying the server cooldown'
    await expect(timer).toHaveText(/3 秒后重试/)
    await expect(button).toBeDisabled()
    await password.press('Enter')
    expect(attempts).toBe(1)
    await expect(timer).toHaveText(/1 秒后重试/)
    stage = 'resuming login after the cooldown'
    await expect(button).toBeEnabled()
    await expect(timer).toHaveCount(0)
    await button.click()
    await expect(page).toHaveURL(`${app.origin}/dashboard`)
    const notice = page.locator('.el-notification.right')
    await expect(notice.getByText('登录成功', { exact: true })).toBeVisible()
    await expect(notice.getByText(/^欢迎回来，.+！$/)).toBeVisible()
  } catch {
    await page.close().catch(() => {})
    throw new Error(`Failed while ${stage}`)
  }
  expect(attempts).toBe(2)
})

test('restores an authorized deep link after login and browser reload', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  const target = '/system/user?source=browser#account-list'
  await signIn(page, app, app.admin, target)
  const heading = page.getByRole('heading', { name: '用户管理', exact: true })
  const account = page.getByRole('row', { name: /browser_admin/ })
  await expect(heading).toBeVisible()
  await expect(account).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(app.origin + target)
  await expect(heading).toBeVisible()
  await expect(account).toBeVisible()
})

test('shows the themed progress bar while a lazy management page is loading', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  await signIn(page, app, app.admin, '/system/user')
  await expandSystemMenu(page)
  let releaseChunks
  const pending = new Promise((resolve) => {
    releaseChunks = resolve
  })
  await page.route('**/assets/js/*.js', async (route) => {
    if (new URL(route.request().url()).origin !== app.origin) return route.abort()
    await pending
    await route.continue()
  })
  const progress = page.locator('.app-navigation-progress')
  await expect(progress).toHaveCount(0)
  try {
    await page.getByRole('menuitem', { name: '角色管理', exact: true }).click()
    await expect(progress).toBeVisible()
    await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true')
  } finally {
    releaseChunks()
  }
  await expect(page.getByRole('heading', { name: '角色管理', exact: true })).toBeVisible()
  await expect(progress).toHaveCount(0)
})

test('applies local appearance settings, falls back on narrow screens and keeps preferences through cache clearing', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  const target = '/system/user'
  await signIn(page, app, app.admin, target)
  const openSettings = () => page.getByRole('button', { name: '应用设置', exact: true }).click()
  const settings = page.getByRole('dialog', { name: '应用设置' })
  const select = (group, option) =>
    settings
      .getByRole('radiogroup', { name: group })
      .getByRole('radio', { name: option, exact: true })
      .locator('xpath=ancestor::label[1]')
      .click({ timeout: 5000 })
  const toggle = (name) =>
    settings.getByRole('switch', { name, exact: true }).locator('..').click({ timeout: 5000 })
  const root = page.locator('html')
  const sidebar = page.locator('.app-sidebar')
  const topNavigation = page.locator('.app-layout__top-navigation')
  const header = page.locator('.app-layout__header')
  const watermark = page.locator('.app-layout__watermark')

  await openSettings()
  await expect(settings.getByRole('radiogroup', { name: '主题色' }).getByRole('radio')).toHaveCount(
    8
  )
  await select('主题色', '青绿')
  await expect(root).toHaveAttribute('data-np-accent', 'teal')
  await toggle('灰色模式')
  await expect(root).toHaveClass(/\bnp-grayscale\b/)
  await toggle('色弱模式')
  await expect(root).not.toHaveClass(/\bnp-color-vision\b/)
  await toggle('灰色模式')
  await expect(root).not.toHaveClass(/\bnp-grayscale\b/)
  await expect(root).toHaveClass(/\bnp-color-vision\b/)

  await select('菜单布局', '顶部')
  await expect(topNavigation).toBeVisible()
  await expect(header.locator('.app-layout__top-navigation')).toBeVisible()
  await expect(header.getByRole('button', { name: '搜索菜单' })).toBeVisible()
  await expect(sidebar).toHaveCount(0)
  await select('菜单布局', '混合')
  await expect(sidebar).toBeVisible()
  const tabStrip = page.locator('.app-tabs')
  for (const [label, style] of [
    ['胶囊', 'pill'],
    ['下划线', 'underline'],
    ['卡片', 'card']
  ]) {
    await select('页签风格', label)
    await expect(tabStrip).toHaveClass(new RegExp(`app-tabs--${style}`))
    await expect(tabStrip).toHaveCSS('overflow-y', 'hidden')
    await expect(tabStrip).toHaveCSS('overflow-x', 'auto')
    await expect
      .poll(() => tabStrip.evaluate((strip) => strip.scrollHeight - strip.clientHeight))
      .toBe(0)
  }
  await toggle('全屏水印')
  await expect(watermark).toBeVisible()
  await expect(watermark).toHaveCSS('pointer-events', 'none')

  await settings.press('Escape')
  await expect(settings).toBeHidden()
  await page.setViewportSize({ width: 640, height: 800 })
  await expect(topNavigation).toHaveCount(0)
  await expect(page.getByRole('button', { name: '打开菜单' })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(topNavigation).toBeVisible()

  await openSettings()
  await expect(settings.getByRole('button', { name: '清空缓存', exact: true })).toHaveCount(0)
  await settings.press('Escape')
  await expect(settings).toBeHidden()
  const userMenu = page.getByRole('button', { name: '用户菜单', exact: true })
  const clear = page.getByRole('menuitem', { name: '清空缓存', exact: true })
  await userMenu.click()
  await clear.click()
  const confirm = page.getByRole('dialog', { name: '清空缓存' })
  await confirm.getByRole('button', { name: '取消', exact: true }).click()
  await expect(confirm).toBeHidden()
  await userMenu.click()
  await clear.click()
  await Promise.all([
    page.waitForEvent('load'),
    confirm.getByRole('button', { name: '清空缓存', exact: true }).click()
  ])
  await expect(page).toHaveURL(app.origin + target)
  await expect(page.getByRole('heading', { name: '用户管理', exact: true })).toBeVisible()
  await expect(root).toHaveAttribute('data-np-accent', 'teal')
  await expect(page.locator('.app-tabs--card')).toBeVisible()
  await expect(watermark).toBeVisible()
})

test('aligns management filter inputs, selects and buttons at every component size', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  await signIn(page, app, app.admin, '/system/department')
  await page.setViewportSize({ width: 1440, height: 900 })
  const sizes = [
    ['小', 24],
    ['默认', 32],
    ['大', 40]
  ]
  for (const [name, height] of sizes) {
    await page.getByRole('button', { name: '应用设置', exact: true }).click()
    const settings = page.getByRole('dialog', { name: '应用设置' })
    await settings.getByText(name, { exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(settings).toBeHidden()
    for (const path of ['user', 'department', 'role', 'dict', 'audit-log']) {
      await page.goto(`${app.origin}/system/${path}`)
      const filters = page.locator('.management-page__filters').first()
      const inputs = filters.locator('.el-input__wrapper, .el-select__wrapper, .el-range-editor')
      const actions = filters.locator('.management-page__filter-actions .el-button')
      await expect(inputs.first()).toBeVisible()
      await expect(actions.first()).toBeVisible()
      for (const control of [...(await inputs.all()), ...(await actions.all())]) {
        expect((await control.boundingBox())?.height, `${path} [${name}]`).toBe(height)
      }
    }
  }
})

test('searches only visible menus and opens a result with the keyboard', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  await signIn(page, app, app.viewer)
  const trigger = page.getByRole('button', { name: '搜索菜单', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '搜索菜单' })
  const search = dialog.getByRole('combobox', { name: '搜索菜单' })
  await expect(search).toBeFocused()
  await search.fill('角色管理')
  await expect(dialog.getByText('没有匹配的菜单')).toBeVisible()
  await search.fill('users')
  const result = dialog.getByRole('option', { name: /用户管理/ })
  await expect(result).toBeVisible()
  await search.fill('/system/user')
  await expect(result).toHaveAttribute('aria-selected', 'true')
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page).toHaveURL(app.origin + '/system/user')
  await expect(dialog).toBeHidden()
  await trigger.click()
  await expect(search).toHaveValue('')
  await search.press('Escape')
  await expect(dialog).toBeHidden()
})

test('menu forms identify used components and persist a selected local SVG icon', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  await signIn(page, app, app.admin, '/system/menu')
  await page.getByRole('button', { name: '新增节点', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增节点' })
  const components = dialog.getByRole('combobox', { name: /页面组件/ })
  const component = page.getByRole('option', { name: /system\/user\/index/ })
  await components.click()
  await expect(component).toContainText('使用中')
  await component.click()
  await dialog.getByRole('textbox', { name: /^\*?\s*名称$/ }).fill('SVG fixture menu')
  await dialog.getByRole('textbox', { name: /路由路径$/ }).fill('/svg-fixture')
  await dialog.getByRole('textbox', { name: /路由名称$/ }).fill('SvgFixture')

  const icons = dialog.getByRole('combobox', { name: '图标名称', exact: true })
  await icons.fill('nova-workspace')
  const svg = page.getByRole('option', { name: 'nova-workspace', exact: true })
  await expect(svg.locator('svg')).toBeVisible()
  await svg.click()
  await expect(dialog.locator('.menu-icon-picker__preview svg')).toBeVisible()
  const [saved] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/system/menus' &&
        response.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: '保存', exact: true }).click()
  ])
  expect(saved.ok()).toBe(true)
  await expect(dialog).toBeHidden()
  const created = page.getByRole('row', { name: /SVG fixture menu/ })
  await created.getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑节点' })
  await expect(edit.locator('.menu-icon-picker__preview svg')).toBeVisible()
  await edit.getByRole('combobox', { name: '图标名称', exact: true }).fill('calendar')
  const calendar = page.getByRole('option', { name: 'calendar', exact: true })
  await expect(calendar.locator('svg')).toBeVisible()
  await calendar.click()
  const [updated] = await Promise.all([
    page.waitForResponse(
      (response) =>
        /^\/api\/system\/menus\/\d+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PUT'
    ),
    edit.getByRole('button', { name: '保存', exact: true }).click()
  ])
  expect(updated.ok()).toBe(true)
  await expect(edit).toBeHidden()
  await created.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(edit.getByText('calendar', { exact: true })).toBeVisible()
  await edit.getByRole('button', { name: '取消', exact: true }).click()

  const role = page.getByRole('row', { name: /角色管理.*system\/role\/index/ })
  await role.getByRole('button', { name: '编辑', exact: true }).click()
  await edit.getByRole('combobox', { name: /页面组件/ }).click()
  await expect(page.getByRole('option', { name: /system\/role\/index/ })).toContainText('当前节点')
})

test('saving role grants updates both the menu and the API permissions', async ({
  browser,
  context,
  app
}) => {
  const admin = await localPage(context, app)
  await signIn(admin, app, app.admin, '/system/role')
  const viewerContext = await browser.newContext(contextOptions)
  try {
    const viewer = await localPage(viewerContext, app)
    const oldAuthorization = await signIn(viewer, app, app.viewer)
    const roleMenu = viewer.getByRole('menuitem', { name: '角色管理', exact: true })
    await expandSystemMenu(viewer)
    await expect(roleMenu).toHaveCount(0)
    expect(await apiStatus(viewer, app, '/system/roles', oldAuthorization)).toBe(403)
    const restrictedPage = `${app.origin}/system/role?source=browser`
    await viewer.goto(restrictedPage)
    await expect(viewer.getByText('403 权限不足', { exact: true })).toBeVisible()
    await expect(viewer).toHaveURL(restrictedPage)
    await viewer.getByRole('button', { name: '返回首页', exact: true }).click()
    await expect(viewer).toHaveURL(`${app.origin}/dashboard`)

    await admin
      .getByRole('row', { name: /只读用户/ })
      .getByRole('button', { name: '授权', exact: true })
      .click()
    const dialog = admin.getByRole('dialog', { name: /角色授权.*只读用户/ })
    const save = dialog.getByRole('button', { name: '保存授权', exact: true })
    await expect(save).toBeEnabled()
    const node = (id) => dialog.locator(`[role="treeitem"][data-key="${id}"]`)
    const toggle = (id) => node(id).locator(':scope > .el-tree-node__content label').click()
    const checked = (id, value) => expect(node(id)).toHaveAttribute('aria-checked', String(value))
    // Opening the existing viewer grant must not select its ungranted create permission.
    await checked(10, true)
    await checked(12, false)
    // The role page (20) contains view (21) and edit (23).
    await toggle(20)
    await checked(21, true)
    await checked(23, true)
    await toggle(20)
    await checked(21, false)
    await checked(23, false)
    await toggle(21)
    await checked(20, true)
    await checked(23, false)
    const [grant] = await Promise.all([
      admin.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/system/roles/3/menus' &&
          response.request().method() === 'PUT'
      ),
      save.click()
    ])
    expect(grant.status()).toBe(200)
    await expect(dialog).toBeHidden()

    const freshContext = await browser.newContext(contextOptions)
    try {
      const freshViewer = await localPage(freshContext, app)
      const newAuthorization = await signIn(freshViewer, app, app.viewer)
      await expandSystemMenu(freshViewer)
      await expect(
        freshViewer.getByRole('menuitem', { name: '角色管理', exact: true })
      ).toBeVisible()
      expect(await apiStatus(freshViewer, app, '/system/roles', newAuthorization)).toBe(200)
      expect(await apiStatus(freshViewer, app, '/system/menus', newAuthorization)).toBe(403)
    } finally {
      await freshContext.close()
    }
  } finally {
    await viewerContext.close()
  }
})

test('revoking other sessions invalidates the old browser while keeping the current one', async ({
  browser,
  context,
  app
}) => {
  const oldContext = await browser.newContext(contextOptions)
  try {
    const older = await localPage(oldContext, app)
    const oldAuthorization = await signIn(older, app, app.admin, '/system/user')
    const current = await localPage(context, app)
    const currentAuthorization = await signIn(current, app, app.admin, '/profile')
    await current.getByRole('tab', { name: '登录会话', exact: true }).click()
    const sessions = current.getByRole('region', { name: '登录会话', exact: true })
    await expect(sessions.getByText('当前会话', { exact: true })).toBeVisible()
    await expect(sessions.getByText('其他会话', { exact: true })).toBeVisible()
    await sessions.getByRole('button', { name: '退出其他会话', exact: true }).click()
    const confirm = current.getByRole('dialog', { name: '退出其他会话', exact: true })
    await confirm.getByRole('button', { name: '退出其他会话', exact: true }).click()
    await expect(sessions.getByText('其他会话', { exact: true })).toHaveCount(0)
    await expect(sessions.getByText('当前会话', { exact: true })).toBeVisible()
    expect(await apiStatus(older, app, '/auth/user', oldAuthorization)).toBe(401)
    expect(await apiStatus(current, app, '/auth/user', currentAuthorization)).toBe(200)
    await older.reload()
    await expect(older).toHaveURL(/\/login\?redirect=/)
  } finally {
    await oldContext.close()
  }
})

test('audit details show safe HTTP metadata and time filters use the app zone', async ({
  context,
  app
}) => {
  const page = await localPage(context, app)
  await page.route(
    (url) => url.pathname === '/api/system/audit-logs',
    (route) =>
      route.fulfill({
        json: {
          code: 0,
          message: 'OK',
          data: {
            total: 1,
            list: [
              {
                id: 42,
                actorId: 1,
                targetType: 'role',
                targetId: 3,
                action: 'role_grant',
                result: 'success',
                statusCode: 200,
                createdAt: Date.UTC(2026, 0, 1)
              }
            ]
          }
        }
      })
  )
  await signIn(page, app, app.admin, '/system/audit-log')
  await expect(page.getByText(/时间范围.*Asia\/Shanghai/)).toBeVisible()
  await page.getByRole('button', { name: '详情', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '审计详情' })
  await expect(dialog.getByText('PUT', { exact: true })).toBeVisible()
  await expect(dialog.getByText('/system/roles/:id/menus', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/200.*成功/)).toBeVisible()
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(dialog).toBeHidden()
  const filters = page.locator('.audit-log__filters')
  const start = filters.getByPlaceholder('开始时间')
  const end = filters.getByPlaceholder('结束时间')
  await start.fill('2026-01-01 08:00:00')
  await end.fill('2026-01-01 09:00:00')
  await end.press('Enter')
  const [request] = await Promise.all([
    page.waitForRequest(
      (req) => {
        const url = new URL(req.url())
        return url.pathname === '/api/system/audit-logs' && url.searchParams.has('createdFrom')
      },
      { timeout: 5000 }
    ),
    page.getByRole('button', { name: '查询', exact: true }).click()
  ])
  const query = new URL(request.url()).searchParams
  expect(query.get('createdFrom')).toBe(String(Date.UTC(2026, 0, 1)))
  expect(query.get('createdTo')).toBe(String(Date.UTC(2026, 0, 1, 1)))
})

test('screen lock survives reload and clears on unlock or sign-in', async ({ context, app }) => {
  const page = await localPage(context, app)
  const authorization = await signIn(page, app, app.admin, '/system/user')
  const lock = page.getByRole('button', { name: '锁定屏幕', exact: true })
  const screen = page.getByRole('dialog', { name: '屏幕已锁定' })
  const unlock = screen.getByRole('button', { name: '解锁', exact: true })
  const relogin = screen.getByRole('button', { name: '重新登录', exact: true })
  const lockPassword = 'fixture-lock'
  const readVerifier = () => page.evaluate(() => sessionStorage.getItem('npora_admin_screen_lock'))

  async function lockPage() {
    await lock.click()
    const prompt = page.getByRole('dialog', { name: '锁定屏幕', exact: true })
    await prompt.locator('input[type=password]').fill(lockPassword)
    await prompt.locator('.el-message-box__btns .el-button--primary').click()
    await expect(screen).toBeVisible()
  }

  await lockPage()
  await expect(screen.getByText('Asia/Shanghai', { exact: true })).toBeVisible()
  const clock = screen.locator('time')
  const initial = await clock.getAttribute('datetime')
  await expect(clock).not.toHaveAttribute('datetime', initial)
  expect(await readVerifier()).not.toContain(lockPassword)

  await page.reload()
  await page.setViewportSize({ width: 360, height: 640 })
  await expect(unlock).toBeInViewport()
  await expect(relogin).toBeInViewport()
  const input = screen.getByLabel('锁屏密码')
  await input.fill('wrong-lock-password')
  await unlock.click()
  await expect(screen.getByRole('alert')).toHaveText('锁屏密码不正确。')
  await input.fill(lockPassword)
  await unlock.click()
  await expect(screen).toBeHidden()
  expect(await readVerifier()).toBeNull()
  await expect(page).toHaveURL(app.origin + '/system/user')
  expect(await apiStatus(page, app, '/auth/user', authorization)).toBe(200)

  await lockPage()
  await relogin.click()
  await expect(page).toHaveURL(app.origin + '/login')
  expect(await readVerifier()).toBeNull()
  await expect.poll(() => apiStatus(page, app, '/auth/user', authorization)).toBe(401)
})

test('manual sign-out requires confirmation', async ({ context, app }) => {
  const page = await localPage(context, app)
  const authorization = await signIn(page, app, app.admin)
  const userMenu = page.getByRole('button', { name: '用户菜单', exact: true })
  const signOut = page.getByRole('menuitem', { name: '退出登录', exact: true })
  const confirm = page.getByRole('dialog', { name: '退出登录', exact: true })
  await userMenu.click()
  await signOut.click()
  await confirm.getByRole('button', { name: '取消', exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(page).toHaveURL(app.origin + '/dashboard')
  expect(await apiStatus(page, app, '/auth/user', authorization)).toBe(200)

  await userMenu.click()
  await signOut.click()
  await confirm.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page).toHaveURL(app.origin + '/login')
  await expect.poll(() => apiStatus(page, app, '/auth/user', authorization)).toBe(401)
})

const showcaseTest = test.extend({ demoMode: [true, { option: true, scope: 'worker' }] })

showcaseTest(
  'demo examples are a top-level menu and keep their existing deep links',
  async ({ context, app }) => {
    const page = await localPage(context, app)
    await signIn(page, app, app.admin)
    await expandSystemMenu(page)
    const system = page.getByRole('menuitem', { name: '系统管理', exact: true })
    const examples = page.getByRole('menuitem', { name: '操作示例', exact: true })
    await expect(examples).toBeVisible()
    await expect(system.getByText('操作示例', { exact: true })).toHaveCount(0)

    await examples.getByText('操作示例', { exact: true }).click()
    await page.getByRole('menuitem', { name: '表格示例', exact: true }).click()
    await expect(page).toHaveURL(app.origin + '/system/operation/table')
  }
)
