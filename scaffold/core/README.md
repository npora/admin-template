# Npora Admin

Vue 3 + TypeScript + Element Plus + Pinia 后台脚手架，保留登录页、核心首页、后台布局、动态菜单、按钮权限、用户/部门/角色/菜单/字典管理、多语言、主题和公共表格分页。

## 开始开发

需要 Node.js 22.12+，可使用 npm、pnpm 或 Yarn，不限制包管理器版本。

```sh
npm install
npm run dev
```

开发地址默认 http://localhost:3000。在 `.env.development.local` 配置自己的 `VITE_API_URL`，按 [接口契约](docs/api.md) 实现后端后即可登录。本项目不使用本地 Mock，不预置登录账号。

`npm run build` 类型检查并构建到 `dist/`。生产服务器应把 `/api` 转发给自己的后端；开发代理配置不会进入生产产物。

## 在线体验

[完整展示网站](https://admin-demo.npora.workers.dev)，演示账号 `admin`，密码 `123456`。这是展示站账号，不是正式 SQL 自动创建的账号。

## 目录与文档

- `src/`：登录页、首页、布局、权限、系统管理和公共组件。
- `public/`：原样输出的静态资源。
- `build/`：公共构建配置和启动加载层。
- `scripts/`、`tests/`：验证命令与核心回归。
- `database/mysql/`：正式权限与字典 SQL，按编号依次导入 `01-schema.sql`、`02-seed.sql`、`03-dictionaries.sql`、`04-query-indexes.sql`。密码哈希和管理员账号由自己的后端初始化。
- `docs/`：接口、权限、多语言、开发和目录说明。

字典类型、数据、选项缓存和标签组件的使用方法见 [字典管理](docs/dictionaries.md)。

登录页和首页分别位于 `src/views/login/`、`src/views/dashboard/`。页面与登录流程完整保留，真实登录、动态菜单及系统管理数据由对接的后端提供。

此预设不包含演示页面与展示站部署工具；纯净版不生成 Worker 后端，选择 Worker 版时额外包含独立后端源码和初始化说明。

[目录职责](docs/project-structure.md) · [开发与配置](docs/development.md) · [后端接入](docs/backend-replacement.md) · [权限模型](docs/rbac.md) · [多语言](docs/i18n.md) · [正式 SQL](database/mysql/README.md)

## 验证

`npm run check` 执行格式、类型和核心测试。`npm run check:views` 检查页面，`npm run check:locales` 检查词条。`npm run preview` 预览构建产物，API 转发仍需自行提供。

## 包管理器

命令以 npm 为例，使用 pnpm 或 Yarn 时调用同名脚本即可，例如 `pnpm run dev`、`yarn dev`。项目不指定 `packageManager`，也不校验包管理器版本。仓库中的 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml` 只服务于 pnpm；npm 和 Yarn 可直接安装并生成自己的锁文件，无需先删除其他文件。实际业务仓库建议只维护所选工具的锁文件。
