export class HttpError extends Error {
  constructor(status, message, code = status, headers = {}) {
    super(message)
    this.status = status
    this.code = code
    this.headers = headers
  }
}
export const unauthorized = () => new HttpError(401, '登录状态已失效', 10002)
export const success = (data) => Response.json({ code: 0, message: 'success', data })

export async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new HttpError(415, '请使用 application/json')
  const limit = 8192
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, '请求体过大')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, '请求体不能为空')
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new HttpError(413, '请求体过大')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error()
    return data
  } catch {
    throw new HttpError(400, 'JSON 格式错误')
  }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  const headers = { Vary: 'Origin' }
  if (!origin) return headers
  // Same-origin requests need no CORS grant; cross-origin requests require an exact allowlist.
  const allowed = (env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (origin !== new URL(request.url).origin && !allowed.includes(origin))
    throw new HttpError(403, '来源未获准访问')
  return {
    ...headers,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600'
  }
}
