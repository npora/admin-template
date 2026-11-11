import { runVite } from './lib/vite.mjs'

runVite(process.argv.slice(2), {
  VITE_DEMO_ENABLED: 'true',
  // 仅开发时的展示 API 代理目标；生产继续走站点同源 /api。
  VITE_API_URL: process.env.VITE_API_URL || 'https://npora-admin-api-test.npora.workers.dev'
})
