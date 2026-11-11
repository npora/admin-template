// Server-owned catalogue. Extend it when the frontend gains another public page entry.
// Never import frontend source files into this independently deployable service.
export const pageComponents = new Set([
  'dashboard/index',
  'profile/index',
  'examples/form/index',
  'examples/cache/index',
  'examples/table/index',
  'examples/download/index',
  'system/user/index',
  'system/role/index',
  'system/menu/index',
  'system/department/index',
  'system/dict/index'
])
export const staticNames = new Set(
  ['Login', 'Layout', 'Dashboard', 'NotFound', 'RouteFallback', 'Profile', 'ExampleForm'].map(
    (value) => value.toLowerCase()
  )
)
export const staticPaths = ['/', '/login', '/dashboard', '/404', '/profile', '/examples/form']
