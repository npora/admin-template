import {
  House,
  Monitor,
  Setting,
  User,
  OfficeBuilding,
  Lock,
  Grid,
  EditPen,
  Collection,
  Bell,
  Calendar,
  DataAnalysis,
  Document,
  Download,
  Files,
  FolderOpened,
  Management,
  Menu,
  Notebook,
  PieChart,
  Search,
  Tickets
} from '@element-plus/icons-vue'

import { localIcons } from './local'
import type { IconComponent } from './types'

const elementIcons = {
  'office-building': OfficeBuilding,
  collection: Collection,
  lock: Lock,
  grid: Grid,
  edit: EditPen,
  house: House,
  monitor: Monitor,
  setting: Setting,
  user: User,
  bell: Bell,
  calendar: Calendar,
  'data-analysis': DataAnalysis,
  document: Document,
  download: Download,
  files: Files,
  'folder-opened': FolderOpened,
  management: Management,
  menu: Menu,
  notebook: Notebook,
  'pie-chart': PieChart,
  search: Search,
  tickets: Tickets
}

const iconRegistry: Record<string, IconComponent> = { ...elementIcons, ...localIcons }

export const iconGroups = {
  element: Object.entries(elementIcons),
  local: Object.entries(localIcons)
}

export function getIcon(name?: string | null): IconComponent | undefined {
  return name && Object.hasOwn(iconRegistry, name) ? iconRegistry[name] : undefined
}
