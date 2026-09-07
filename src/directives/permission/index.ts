import type { App } from 'vue'

import { permission } from './permission'

export function setupPermissionDirective(
  app: App
): void {
  app.directive(
    'permission',
    permission
  )
}