import { defineConfig, loadEnv, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

const resolvePath = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url))

export default defineConfig(({ command, mode }) => {
  const root = resolvePath('./')
  const env = loadEnv(mode, root)

  const isBuild = command === 'build'
  const isProd = mode === 'production'

  // .env: API 请求前缀
  const apiPrefix =
    env.VITE_API_PREFIX?.trim() || '/api'

  // .env: VITE_BUILD_COMPRESS=false 可关闭构建压缩
  const shouldCompress =
    isBuild && env.VITE_BUILD_COMPRESS !== 'false'

  // .env: VITE_BUILD_ANALYZE=true 可生成构建体积分析报告
  const shouldAnalyze =
    isBuild && env.VITE_BUILD_ANALYZE === 'true'

  return {
    resolve: {
      alias: {
        '@': resolvePath('./src'),
        '#': resolvePath('./src/types'),
        assets: resolvePath('./src/assets')
      }
    },

    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: false,
      open: true,

      proxy: {
        [apiPrefix]: {
          // .env.development: 后端 API 地址
          target:
            env.VITE_API_URL?.trim() ||
            'http://localhost:8080',

          changeOrigin: true,

          rewrite: (path) =>
            path.startsWith(apiPrefix)
              ? path.slice(apiPrefix.length) || '/'
              : path
        }
      }
    },

    plugins: [
      vue(),

      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/auto-imports.d.ts',
        viteOptimizeDeps: true
      }),

      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/components.d.ts'
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
          assetFileNames:
            'assets/[ext]/[name]-[hash][extname]',

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