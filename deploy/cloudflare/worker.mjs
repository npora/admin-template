const forwardedHeaders = ['accept', 'authorization', 'content-type', 'cf-connecting-ip']

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const prefix = env.API_PREFIX || '/api'
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`))
      return new Response('Not found', { status: 404 })

    const target = new URL('https://api.internal')
    target.pathname = url.pathname.slice(prefix.length) || '/'
    target.search = url.search
    const headers = new Headers()
    for (const key of forwardedHeaders) {
      const value = request.headers.get(key)
      if (value !== null) headers.set(key, value)
    }
    try {
      // Service binding fixes the destination; incoming URLs cannot select another host.
      const outgoing = new Request(new Request(target, request), { headers, redirect: 'manual' })
      const upstream = await env.API.fetch(outgoing)
      const response = new Response(upstream.body, upstream)
      response.headers.set('Cache-Control', 'no-store')
      return response
    } catch {
      console.error(JSON.stringify({ event: 'api_proxy_failed' }))
      return Response.json(
        { code: 502, message: 'API service unavailable', data: null },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      )
    }
  }
}
