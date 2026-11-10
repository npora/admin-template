import {
  House,
  Monitor,
  Setting,
  User,
  OfficeBuilding,
  Lock,
  Grid,
  EditPen
} from '@element-plus/icons-vue'

import type { IconComponent } from './types'

const iconRegistry: Record<string, IconComponent> = {
  'office-building': OfficeBuilding,
  lock: Lock,
  grid: Grid,
  edit: EditPen,
  house: House,
  monitor: Monitor,
  setting: Setting,
  user: User
}

export function getIcon(name?: string): IconComponent | undefined {
  if (!name) {
    return undefined
  }

  return iconRegistry[name]
}
