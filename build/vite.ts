import type { ConfigEnv, PluginOption, UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { appLoading } from './app-loading.ts'
import { normalizeApiPrefix } from '../src/config/env.ts'
import { resolve } from 'node:path'

import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

export function coreConfig(
  root: string,
  { command, mode }: ConfigEnv,
  env: Record<string, string>
): UserConfig {
  const resolvePath = (path: string) => resolve(root, path)
  const isBuild = command === 'build'
  const isProd = mode === 'production'

  // .env: API 请求前缀
  const apiPrefix = normalizeApiPrefix(env.VITE_API_PREFIX)

  // .env: VITE_BUILD_COMPRESS=false 可关闭构建压缩
  const shouldCompress = isBuild && env.VITE_BUILD_COMPRESS !== 'false'

  // .env: VITE_BUILD_ANALYZE=true 可生成构建体积分析报告
  const shouldAnalyze = isBuild && env.VITE_BUILD_ANALYZE === 'true'

  return {
    // 使用 Composition API，保留 JSON 词条所需的消息编译器。
    define: {
      __DEMO_ENABLED__: false,
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
      __INTLIFY_DROP_MESSAGE_COMPILER__: false
    },
    resolve: {
      alias: {
        '@': resolvePath('./src')
      }
    },

    // 首页按需组件提前预构建，减少首次跳转时的依赖补充优化。
    optimizeDeps: {
      include: ['element-plus/es/components/skeleton/index']
    },

    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: false,
      open: false,

      proxy: {
        [apiPrefix]: {
          // .env.development: 后端 API 地址
          target: env.VITE_API_URL?.trim() || 'http://localhost:8080',

          changeOrigin: true,

          rewrite: (path: string) =>
            path.startsWith(apiPrefix) ? path.slice(apiPrefix.length) || '/' : path
        }
      }
    },

    plugins: [
      appLoading(root, env.VITE_APP_TITLE?.trim() || 'Npora Admin'),
      vue(),

      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/generated/components.d.ts'
      }),

      shouldCompress &&
        compression({
          algorithms: ['gzip'],
          threshold: 10 * 1024,
          deleteOriginalAssets: false,
          skipIfLargerOrEqual: true
        }),

      shouldAnalyze &&
        (visualizer({
          filename: 'report.html',
          template: 'treemap',
          open: false,
          gzipSize: true,
          brotliSize: true
        }) as PluginOption)
    ],

    build: {
      sourcemap: false,
      reportCompressedSize: false,

      rolldownOptions: {
        output: {
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash][extname]',

          minify: isProd
            ? {
                compress: {
                  dropConsole: true,
                  dropDebugger: true
                }
              }
            : undefined
        }
      }
    }
  }
}
