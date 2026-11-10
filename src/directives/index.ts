import type { App } from 'vue'

import { setupPermissionDirective } from './permission'

export function setupDirectives(app: App): void {
  setupPermissionDirective(app)
}
