import assert from 'node:assert/strict'
import { installMemoryStorage, createTestServer } from '../helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer()
try {
  const { createTokenStorage } = await server.ssrLoadModule('/src/api/auth/token-storage.ts')
  const { localStorageService, sessionStorageService } = await server.ssrLoadModule(
    '/src/utils/storage/index.ts'
  )
  const { STORAGE_KEYS } = await server.ssrLoadModule('/src/constants/storage.ts')
  const session = createTokenStorage('session')
  session.set('short-token', false)
  assert.equal(localStorageService.get(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN), null)
  sessionStorageService.clear()
  assert.equal(createTokenStorage('session').get(), null)
  const expiry = Date.now() + 600000
  session.set('remembered-token', true, expiry)
  sessionStorageService.clear()
  assert.equal(createTokenStorage('session').get(), 'remembered-token')
  assert.equal(createTokenStorage('memory').get(), null)
  session.set('remembered-token')
  assert.equal(
    localStorageService.get(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN).expiresAt,
    expiry,
    'refresh must not extend persistent expiry'
  )
  localStorageService.set(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN, {
    token: 'expired',
    expiresAt: Date.now() - 1
  })
  assert.equal(session.get(), null)
  for (const value of [
    'bad',
    3,
    { token: 1, expiresAt: Date.now() + 1000 },
    { token: 'bad', expiresAt: null }
  ]) {
    localStorageService.set(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN, value)
    assert.equal(session.get(), null)
  }
  session.set('remembered-token', true, expiry)
  session.set('other-account-token', false)
  assert.equal(localStorageService.get(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN), null)
  assert.equal(session.get(), 'other-account-token')
  session.set('remembered-token', true, expiry)
  session.remove()
  assert.equal(session.get(), null)
  assert.equal(localStorageService.get(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN), null)
  createTokenStorage('memory').set('memory-only', true, expiry)
  assert.equal(localStorageService.get(STORAGE_KEYS.REMEMBERED_ACCESS_TOKEN), null)
  console.log(
    '通过：保持登录仅存会话 Token、过期清理、刷新不续期、退出与切换账号清理、内存模式不持久化。'
  )
} finally {
  await server.close()
}
