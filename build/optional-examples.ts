import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** 核心构建不导入演示代码；演示目录可以独立维护或完全省略。 */
export function optionalExamples(
  root: string,
  requested: boolean
): { enabled: boolean; plugin: Plugin } {
  const available = existsSync(resolve(root, 'examples/index.ts'))
  if (requested && !available) throw new Error('演示入口不存在，请使用核心模式或恢复 examples/。')
  const id = '\0virtual:admin-examples'
  return {
    enabled: requested,
    plugin: {
      name: 'optional-admin-examples',
      resolveId(source) {
        if (source === 'virtual:admin-examples') return id
      },
      load(source) {
        if (source !== id) return
        return requested
          ? 'export { demoRoutes, demoViews, demoDashboard } from "/examples/index.ts"'
          : 'export const demoRoutes = []; export const demoViews = {}; export const demoDashboard = undefined;'
      }
    }
  }
}
