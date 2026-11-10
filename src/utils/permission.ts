export type PermissionValue = string | readonly string[]

export type PermissionMode = 'any' | 'all'

function normalizePermission(value: PermissionValue): string[] {
  if (typeof value === 'string') {
    return value ? [value] : []
  }

  return value.filter(Boolean)
}

export function checkPermission(
  permissions: readonly string[],
  value: PermissionValue,
  mode: PermissionMode = 'any'
): boolean {
  const required = normalizePermission(value)

  if (required.length === 0) {
    return false
  }

  if (permissions.includes('*')) {
    return true
  }

  if (mode === 'all') {
    return required.every((permission) => permissions.includes(permission))
  }

  return required.some((permission) => permissions.includes(permission))
}
