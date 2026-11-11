# Npora Admin 完整演示

Vue 3 + TypeScript + Element Plus + Pinia 后台脚手架的完整演示版本，保留登录页、演示首页、核心权限管理、示例页面和独立测试后端。

## 启动

需要 Node.js 22.12+ 和项目指定版本的 pnpm。

```sh
pnpm install
pnpm dev:demo
```

展示开发默认通过真实 HTTP 连接测试 API，需要网络。`pnpm build:demo` 构建完整演示；`pnpm build` 构建核心模式；`pnpm dev` 是否启用演示取决于 `.env.development.local` 的 `VITE_DEMO_ENABLED`。使用自己的后端时在 `.env.development.local` 配置 `VITE_API_URL`；生产需要站点 API 转发。

[在线体验](https://admin-demo.npora.workers.dev)，账号 `admin`，密码 `123456`。演示账号不是正式 SQL 自动创建的账号。

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

正式 MySQL 依次导入 `01-schema.sql`、`02-seed.sql`；账号和密码哈希由自己的后端初始化。Worker SQLite 迁移与 MySQL SQL 独立使用。没有本地 Mock，普通前端构建不启动或部署后端。

## 文档与检查

[目录职责](docs/project-structure.md) · [接口契约](docs/api.md) · [权限](docs/rbac.md) · [多语言](docs/i18n.md) · [开发配置](docs/development.md) · [后端切换](docs/backend-replacement.md) · [正式 SQL](database/mysql/README.md)

`pnpm run check` 检查核心；`pnpm run check:examples` 检查示例；`pnpm run check:backend` 检查测试后端；`pnpm run check:all` 执行完整回归。
