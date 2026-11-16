import type { PluginOption } from 'vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

/** 完整仓库的可选构建工具；不进入纯净版和 Worker 版。 */
export function optionalTools(env: Record<string, string>, isBuild: boolean): PluginOption[] {
  if (!isBuild) return []
  return [
    env.VITE_BUILD_COMPRESS !== 'false' &&
      compression({
        algorithms: ['gzip'],
        threshold: 10 * 1024,
        deleteOriginalAssets: false,
        skipIfLargerOrEqual: true
      }),
    env.VITE_BUILD_ANALYZE === 'true' &&
      (visualizer({
        filename: 'report.html',
        template: 'treemap',
        open: false,
        gzipSize: true,
        brotliSize: true
      }) as PluginOption)
  ]
}
