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
    // The checked-in seed assigns 20 to the role page and 21 to its view permission.
    for (const id of [20, 21]) {
      const node = dialog.locator(`[role="treeitem"][data-key="${id}"]`)
      await node.locator(':scope > .el-tree-node__content label').click()
      await expect(node).toHaveAttribute('aria-checked', 'true')
    }
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
