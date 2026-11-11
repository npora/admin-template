# Npora Admin

Vue 3 + TypeScript + Element Plus + Pinia 后台脚手架，保留登录、动态菜单、按钮权限、用户/部门/角色/菜单管理、多语言、主题和公共表格分页。

## 开始开发

需要 Node.js 22.12+ 和 `package.json` 指定的 pnpm。

```sh
pnpm install
pnpm dev
```

开发地址默认 http://localhost:3000。在 `.env.development.local` 配置自己的 `VITE_API_URL`，按 [接口契约](docs/api.md) 实现后端后即可登录。本项目不使用本地 Mock，不预置登录账号。

`pnpm build` 类型检查并构建到 `dist/`。生产服务器应把 `/api` 转发给自己的后端；开发代理配置不会进入生产产物。

## 在线体验

[完整展示网站](https://admin-demo.npora.workers.dev)，演示账号 `admin`，密码 `123456`。这是展示站账号，不是正式 SQL 自动创建的账号。

## 目录与文档

- `src/`：布局、登录、权限、系统管理和公共组件。
- `public/`：原样输出的静态资源。
- `build/`：公共构建配置和启动加载层。
- `scripts/`、`tests/`：验证命令与核心回归。
- `database/mysql/`：正式权限 SQL，先导入 `01-schema.sql`，再导入 `02-seed.sql`。密码哈希和管理员账号由自己的后端初始化。
- `docs/`：接口、权限、多语言、开发和目录说明。

此预设不包含演示页面与展示站部署工具。可选后端是否生成，取决于创建时选择的模板。

[目录职责](docs/project-structure.md) · [开发与配置](docs/development.md) · [后端接入](docs/backend-replacement.md) · [权限模型](docs/rbac.md) · [多语言](docs/i18n.md) · [正式 SQL](database/mysql/README.md)

## 验证

`pnpm run check` 执行格式、类型和核心测试。`pnpm run check:views` 检查页面，`pnpm run check:locales` 检查词条。`pnpm preview` 预览构建产物，API 转发仍需自行提供。
