# 开发与环境配置

执行 `pnpm install`、`pnpm dev` 开发，`pnpm build` 构建，`pnpm run check` 验证。

| 文件                             | 作用                     |
| -------------------------------- | ------------------------ |
| `.env`                           | 所有模式共享的公共默认值 |
| `.env.development`               | 开发模式默认值           |
| `.env.production`                | 生产模式默认值           |
| `.env.development.local`         | 本机开发覆盖值，忽略提交 |
| `.env.development.local.example` | 本机配置示例             |

同名配置以现有进程环境优先，然后是模式 local、模式文件、通用 local、`.env`。开发配置修改后重启 Vite。

`VITE_API_URL` 用于开发代理，`VITE_API_PREFIX` 默认 `/api`。生产服务应配置同源 API 转发。`VITE_` 开头的变量可能暴露给浏览器，禁止存放密钥。

多语言默认语言、启用开关、支持列表在 `src/config/i18n.ts`；Element Plus、Day.js 与页面日期格式同步切换。具体见 [多语言](i18n.md)。

纯净前端需要自己的后端才能登录，不在浏览器模拟认证。Worker 预设额外包含 `workers/api/`，运行方式见该目录说明。
