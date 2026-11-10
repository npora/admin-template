import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** 前端只认识虚拟适配器；整个 mock 目录删除后仍能解析和构建。 */
export function optionalMock(
  root: string,
  enabled: boolean
): { available: boolean; plugin: Plugin } {
  const available = existsSync(resolve(root, 'mock/index.ts'))
  const id = '\0virtual:admin-mock'
  return {
    available,
    plugin: {
      name: 'optional-admin-mock',
      resolveId(source) {
        if (source === 'virtual:admin-mock') return id
      },
      load(source) {
        if (source !== id) return
        return available && enabled
          ? 'export { mockAdapter } from "/mock/index.ts"'
          : 'export const mockAdapter = { request() { throw new Error("Mock adapter is disabled") } }'
      }
    }
  }
}
