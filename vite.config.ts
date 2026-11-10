import { defineConfig, loadEnv, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { optionalMock } from './build/optional-mock.ts'
import { appLoading } from './build/app-loading.ts'
import { normalizeApiPrefix } from './src/config/env.ts'
import { fileURLToPath } from 'node:url'

import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig(({ command, mode }) => {
  const root = resolvePath('./')
  const env = loadEnv(mode, root)

  const isBuild = command === 'build'
  const mock = optionalMock(root, command === 'serve' && env.VITE_API_MOCK === 'true')
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
      __MOCK_AVAILABLE__: mock.available,
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

          rewrite: (path) =>
            path.startsWith(apiPrefix) ? path.slice(apiPrefix.length) || '/' : path
        }
      }
    },

    plugins: [
      appLoading(root, env.VITE_APP_TITLE?.trim() || 'Npora Admin'),
      mock.plugin,
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
})
