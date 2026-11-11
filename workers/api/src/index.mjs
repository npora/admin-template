import { HttpError, corsHeaders, success } from './http.mjs'
import { login, logout, currentUser, routes } from './modules/auth.mjs'
import { users } from './modules/users.mjs'
import { roles } from './modules/roles.mjs'
import { menus } from './modules/menus.mjs'
import { departments } from './modules/departments.mjs'
import { dictionaryRoute } from './modules/dictionaries.mjs'
import { dashboard } from './modules/dashboard.mjs'

async function health(_request, env) {
  try {
    const row = await env.DB.prepare('SELECT 1 AS ok').first()
    if (row?.ok !== 1) throw new Error('Unexpected database result')
    return success({ database: 'connected' })
  } catch {
    throw new HttpError(503, 'Database unavailable')
  }
}
const endpoints = new Map([
  ['/health', ['GET', health]],
  ['/auth/login', ['POST', login]],
  ['/auth/logout', ['POST', logout]],
  ['/auth/user', ['GET', currentUser]],
  ['/auth/routes', ['GET', routes]],
  ['/system/dashboard', ['GET', dashboard]]
])
function managementRoute(path) {
  const match =
    /^\/system\/(users|roles|menus|departments)(?:\/(options|menu-options|[1-9]\d*)(?:\/(menus))?)?$/.exec(
      path
    )
  if (!match) return undefined
  const [, resource, identifier, suffix] = match
  const routeId = identifier && /^\d+$/.test(identifier) ? Number(identifier) : undefined
  if (routeId !== undefined && !Number.isSafeInteger(routeId)) return undefined
  const operation = suffix || (routeId ? undefined : identifier)
  if (operation === 'options' && !['roles', 'departments'].includes(resource)) return undefined
  if (operation === 'menu-options' && resource !== 'roles') return undefined
  if (operation === 'menus' && (resource !== 'roles' || !routeId)) return undefined
  const methods = operation
    ? operation === 'menus'
      ? 'GET, PUT'
      : 'GET'
    : routeId
      ? 'PUT, DELETE'
      : 'GET, POST'
  const handler = { users, roles, menus, departments }[resource]
  return [
    methods,
    (request, env) =>
      handler(
        request,
        env,
        routeId,
        resource === 'departments' ? operation === 'options' : operation
      )
  ]
}
export default {
  async fetch(request, env) {
    let cors = { Vary: 'Origin' }
    let response
    try {
      cors = corsHeaders(request, env)
      const rawPath = new URL(request.url).pathname
      const path = rawPath.startsWith('/api/') ? rawPath.slice(4) : rawPath
      const endpoint = endpoints.get(path) || dictionaryRoute(path) || managementRoute(path)
      if (!endpoint) throw new HttpError(404, 'Not found')
      if (request.method === 'OPTIONS') response = new Response(null, { status: 204 })
      else {
        if (!endpoint[0].split(', ').includes(request.method))
          throw new HttpError(405, 'Method not allowed', 405, { Allow: endpoint[0] })
        response = await endpoint[1](request, env)
      }
    } catch (error) {
      const known = error instanceof HttpError
      if (!known || error.status >= 500)
        console.error({ event: 'request.failed', status: known ? error.status : 503 })
      response = Response.json(
        {
          code: known ? error.code : 503,
          message: known ? error.message : '服务暂时不可用，请稍后重试',
          data: null
        },
        { status: known ? error.status : 503, headers: known ? error.headers : {} }
      )
    }
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }
}
