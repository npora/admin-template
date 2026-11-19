# Npora Admin 完整演示

Vue 3 + TypeScript + Element Plus + Pinia 后台脚手架的完整演示版本，保留登录页、演示首页、核心权限管理、示例页面和独立测试后端。

## 启动

建议使用 Node.js 24 LTS 的最新补丁版本，可使用 npm、pnpm 或 Yarn。展示版包含 Cloudflare CLI，使用 Node 24 时其锁定版本要求 24.22.0 或更高。

```sh
npm install
npm run dev:demo
```

展示开发默认通过真实 HTTP 连接测试 API，需要网络。`npm run build:demo` 构建完整演示；`npm run build` 构建核心模式；`npm run dev` 是否启用演示取决于 `.env.development.local` 的 `VITE_DEMO_ENABLED`。使用自己的后端时在 `.env.development.local` 配置 `VITE_API_URL`；生产需要站点 API 转发。

[在线体验](https://admin.npora.live)，账号 `admin`，密码 `123456`。公开演示账号的密码和验证器仅供登录体验，可使用自行创建的测试账号体验账号安全功能。

演示接口地址：`https://api.npora.live`。本地展示命令默认代理到此地址，生产页面仍请求同源 `/api`。

生产构建会生成 PWA 的 `sw.js`。浏览器检测到新版 Service Worker 等待激活后会提示刷新，确认后激活新版并重新加载网页。

应用 Worker 审计迁移 `0011_audit_logs.sql` 后，有 `system:audit-log:list` 权限的用户可在“系统管理 → 操作审计日志”查询账号安全和角色授权记录。接口字段见 [审计接口契约](docs/api.md#操作审计日志)。

## 目录

| 目录                 | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `src/`               | 登录、核心首页、布局、权限、公共组件、系统管理 |
| `examples/`          | 演示入口、美化首页、表格、表单、下载与缓存示例 |
| `workers/api/`       | 独立测试后端源码、迁移、初始化和测试           |
| `deploy/`            | 展示站实现                                     |
| `database/mysql/`    | 正式 MySQL 表结构与核心授权，不包含测试账号    |
| `public/`、`build/`  | 静态资源、加载层和构建辅助                     |
| `scripts/`、`tests/` | 开发与验证命令                                 |
| `docs/`              | 目录、接口、权限、开发与通用部署说明           |

正式 MySQL 的新库初始化及增量迁移见 [正式 SQL 说明](database/mysql/README.md)。账号和密码哈希由自己的后端初始化。Worker SQLite 迁移与 MySQL SQL 独立使用。没有本地 Mock，普通前端构建不启动或部署后端。

## 文档与检查

[目录职责](docs/project-structure.md) · [接口契约](docs/api.md) · [权限](docs/rbac.md) · [多语言](docs/i18n.md) · [开发配置](docs/development.md) · [后端切换](docs/backend-replacement.md) · [正式 SQL](database/mysql/README.md)

`npm run check` 检查核心；`npm run check:examples` 检查示例；`npm run check:backend` 检查测试后端；`npm run check:all` 执行完整回归。

## 包管理器

命令以 npm 为例，使用 pnpm 或 Yarn 时调用同名脚本即可，例如 `pnpm run dev`、`yarn dev`。项目不指定 `packageManager`，也不校验包管理器版本。仓库以 npm 和 `package-lock.json` 为准，使用 `npm ci` 安装锁定依赖。pnpm、Yarn 仍可安装运行并维护自己的锁文件，不需要先删除文件；实际业务仓库建议只维护所选工具的锁文件。

## 开发教程、变更与许可

[新增业务页面](docs/new-business-page.md) · [变更记录](CHANGELOG.md) · [MIT 许可证](LICENSE)。第三方依赖遵循各自许可证。
