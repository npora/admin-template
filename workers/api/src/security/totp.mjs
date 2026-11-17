const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const encoder = new TextEncoder()
const bytes = (hex) => Uint8Array.from(hex.match(/../g), (part) => parseInt(part, 16))
const hex = (value) =>
  Array.from(new Uint8Array(value), (n) => n.toString(16).padStart(2, '0')).join('')

export function createTotpSecret() {
  const data = crypto.getRandomValues(new Uint8Array(20))
  let buffer = 0,
    bits = 0,
    result = ''
  for (const value of data) {
    buffer = (buffer << 8) | value
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += alphabet[(buffer >>> bits) & 31]
    }
  }
  return result
}
function decode(secret) {
  if (!/^[A-Z2-7]{32}$/.test(secret)) throw new Error('Invalid TOTP secret')
  let buffer = 0,
    bits = 0
  const output = []
  for (const character of secret) {
    buffer = (buffer << 5) | alphabet.indexOf(character)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((buffer >>> bits) & 255)
    }
  }
  return new Uint8Array(output)
}
export async function totpCode(secret, step, digits = 6) {
  const counter = new Uint8Array(8)
  new DataView(counter.buffer).setBigUint64(0, BigInt(step))
  const key = await crypto.subtle.importKey(
    'raw',
    decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
  const offset = mac[mac.length - 1] & 15
  return String((new DataView(mac.buffer).getUint32(offset) & 0x7fffffff) % 10 ** digits).padStart(
    digits,
    '0'
  )
}
export async function verifyTotp(secret, code, now, lastStep = -1) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null
  const step = Math.floor(now / 30000)
  const comparisonKey = await crypto.subtle.importKey(
    'raw',
    decode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  let matched = null
  for (const candidate of [step - 1, step, step + 1]) {
    const expected = await totpCode(secret, candidate)
    const signature = await crypto.subtle.sign('HMAC', comparisonKey, encoder.encode(expected))
    const valid = await crypto.subtle.verify('HMAC', comparisonKey, signature, encoder.encode(code))
    if (valid && candidate > lastStep) matched = candidate
  }
  return matched
}
export function totpKeyConfigured(env) {
  return typeof env.AUTH_TOTP_KEY === 'string' && /^[a-f0-9]{64}$/.test(env.AUTH_TOTP_KEY)
}
async function encryptionKey(env) {
  if (!totpKeyConfigured(env)) throw new Error('Missing TOTP encryption key')
  return crypto.subtle.importKey('raw', bytes(env.AUTH_TOTP_KEY), 'AES-GCM', false, [
    'encrypt',
    'decrypt'
  ])
}
export async function encryptTotp(secret, userId, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(`totp:${userId}`) },
    await encryptionKey(env),
    encoder.encode(secret)
  )
  return `v1:${hex(iv)}:${hex(ciphertext)}`
}
export async function decryptTotp(value, userId, env) {
  if (!/^v1:[a-f0-9]{24}:[a-f0-9]{96}$/.test(value))
    throw new Error('Invalid encrypted TOTP secret')
  const [, iv, ciphertext] = value.split(':')
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(iv), additionalData: encoder.encode(`totp:${userId}`) },
      await encryptionKey(env),
      bytes(ciphertext)
    )
  )
}
