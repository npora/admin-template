const encoder = new TextEncoder()
const iterations = 100_000
export const randomHex = (size = 32) => hex(crypto.getRandomValues(new Uint8Array(size)))
function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('')
}
function unhex(value) {
  return Uint8Array.from(value.match(/../g), (part) => Number.parseInt(part, 16))
}
export async function digest(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}
function pepperKey(pepper) {
  if (typeof pepper !== 'string' || !/^[a-f0-9]{64}$/.test(pepper))
    throw new Error('AUTH_PEPPER must be a 32-byte random hex Secret')
  return crypto.subtle.importKey('raw', unhex(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign'
  ])
}
async function derive(password, salt, pepper) {
  const prehash = await crypto.subtle.sign(
    'HMAC',
    await pepperKey(pepper),
    encoder.encode(password)
  )
  const key = await crypto.subtle.importKey('raw', prehash, 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations },
    key,
    256
  )
}
export async function hashPassword(password, pepper) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128)
    throw new Error('Password must contain 12–128 characters')
  const salt = randomHex(16)
  return `npora-v1$${iterations}$${salt}$${hex(await derive(password, salt, pepper))}`
}
export async function verifyPassword(password, stored, pepper) {
  // An unknown/corrupt account still pays the same KDF cost; public response is identical.
  const match = /^npora-v1\$100000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(stored || '')
  const actual = await derive(password, match?.[1] ?? '0'.repeat(32), pepper)
  const expected = unhex(match?.[2] ?? '0'.repeat(64))
  // Portable WebCrypto constant-time MAC verification (also works in Node tests).
  const algorithm = { name: 'HMAC', hash: 'SHA-256' }
  const signing = await crypto.subtle.importKey('raw', actual, algorithm, false, ['sign'])
  const verifying = await crypto.subtle.importKey('raw', expected, algorithm, false, ['verify'])
  const message = encoder.encode('npora-password-verification-v1')
  const valid = await crypto.subtle.verify(
    'HMAC',
    verifying,
    await crypto.subtle.sign('HMAC', signing, message),
    message
  )
  return Boolean(match) && valid
}
