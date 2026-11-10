// 仅用于开发 Mock；真实后端自行管理密码哈希与凭据策略，哈希永不出现在 DTO 中。
const encoder = new TextEncoder()
const iterations = 600_000
export async function hashMockPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  )
  const hex = (bytes: Uint8Array) =>
    Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(new Uint8Array(hash))}`
}
export async function verifyMockPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, rounds, saltHex, expected] = encoded.split('$')
  if (scheme !== 'pbkdf2' || !saltHex || !expected) return false
  const salt = new Uint8Array(saltHex.match(/../g)!.map((value) => parseInt(value, 16)))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ])
  const hash = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: Number(rounds), hash: 'SHA-256' },
      key,
      256
    )
  )
  const actual = Array.from(hash, (value) => value.toString(16).padStart(2, '0')).join('')
  return actual === expected
}
