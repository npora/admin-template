import type { ConfigEnv, PluginOption, UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { appLoading } from './app-loading.ts'
import { normalizeApiPrefix } from '../src/config/env.ts'
import { dirname, resolve } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'

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
  const componentRoot = resolve(
    dirname(createRequire(import.meta.url).resolve('element-plus/package.json')),
    'es/components'
  )
  // 样式入口没有对应的 .d.ts，不能依赖包 exports 的 glob 展开。
  const componentStyles = readdirSync(componentRoot)
    .filter((name) => existsSync(resolve(componentRoot, name, 'style/css.mjs')))
    .map((name) => `element-plus/es/components/${name}/style/css`)

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

    // 覆盖插件注入的深层组件及样式入口，避免首次访问懒加载页时补充优化并整页刷新。
    optimizeDeps: {
      include: ['element-plus/es/components/*/index', ...componentStyles]
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
