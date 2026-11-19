# Npora Admin

Vue 3 + TypeScript + Element Plus + Pinia 后台脚手架，保留登录页、核心首页、后台布局、动态菜单、按钮权限、用户/部门/角色/菜单/字典管理、多语言、主题和公共表格分页。

## 开始开发

建议使用 Node.js 24 LTS，可使用 npm、pnpm 或 Yarn。

```sh
npm install
npm run dev
```

开发地址默认 http://localhost:3000。在 `.env.development.local` 配置自己的 `VITE_API_URL`，按 [接口契约](docs/api.md) 实现后端后即可登录。本项目不使用本地 Mock，不预置登录账号。

`npm run build` 类型检查并构建到 `dist/`。生产服务器应把 `/api` 转发给自己的后端；开发代理配置不会进入生产产物。

生产构建会生成 PWA 的 `sw.js`。浏览器检测到新版 Service Worker 等待激活后会提示刷新，确认后激活新版并重新加载网页。

## 时区与可选验证器

默认北京时间，可在应用设置中切换 32 个常用时区（含巴基斯坦），偏好保存在浏览器。内容区切页动画默认淡入淡出，可在应用设置中切换上下滑动或关闭。默认值在 `src/config/datetime.ts`，枚举在 `src/types/timezone.ts`；时间区间使用 `DateRangePicker` 并输出毫秒时间戳，参照 [日期与时区](docs/i18n.md#时区配置与时间区间)。

`.env` 的 `VITE_AUTHENTICATOR_ENABLED` 默认为 `false`，开启前需对接支持验证器的后端。管理员创建绑定立即生效，用户导入自己手机后即可使用动态码登录；个人中心支持自行解绑、重新绑定，详见 [登录与账号安全](docs/authentication.md)。

已绑定验证器的用户可通过登录页的“忘记密码”自助重置。个人中心改密需要原密码，已绑定时还需动态码，改密成功后重新登录。登录和忘记密码通过固定路由访问，菜单管理只列出支持动态加载的业务页面。

## 操作审计日志

“系统管理 → 操作审计日志”可按操作和结果筛选账号安全与角色授权记录。纯净版页面由自有后端提供数据，按需应用 [MySQL 审计迁移](database/mysql/08-audit-logs.sql)，遵循 [审计接口契约](docs/api.md#操作审计日志) 并授予 `system:audit-log:list`。

## 在线体验

[完整展示网站](https://admin.npora.live)，演示账号 `admin`，密码 `123456`。这是展示站账号，不是正式 SQL 自动创建的账号。

## 目录与文档

- `src/`：登录页、首页、布局、权限、系统管理和公共组件。
- `public/`：原样输出的静态资源。
- `build/`：公共构建配置和启动加载层。
- `scripts/`、`tests/`：验证命令与核心回归。
- `database/mysql/`：纯净版的数据库文件仅采用 MySQL，包含 [新库初始化入口和已有库迁移](database/mysql/README.md)。密码哈希和管理员账号由自己的后端初始化。
- `docs/`：接口、权限、多语言、开发和目录说明。

字典类型、数据、选项缓存和标签组件的使用方法见 [字典管理](docs/dictionaries.md)。

登录页和首页分别位于 `src/views/login/`、`src/views/dashboard/`。页面与登录流程完整保留，真实登录、动态菜单及系统管理数据由对接的后端提供。

此预设不包含演示页面与展示站部署工具；纯净版不生成 Worker 后端，选择 Worker 版时额外包含独立后端源码和初始化说明。

[目录职责](docs/project-structure.md) · [开发与配置](docs/development.md) · [登录与账号安全](docs/authentication.md) · [后端接入](docs/backend-replacement.md) · [权限模型](docs/rbac.md) · [多语言](docs/i18n.md) · [正式 SQL](database/mysql/README.md)

基础开发依赖仅用于 Vue/Vite 构建、组件按需加载、Sass、TypeScript 类型与格式检查；不附带体积分析、额外压缩或展示站部署依赖。

## 验证

`npm run check` 执行格式、类型和核心测试。`npm run check:views` 检查页面，`npm run check:locales` 检查词条。`npm run preview` 预览构建产物，API 转发仍需自行提供。

## 包管理器

命令以 npm 为例，使用 pnpm 或 Yarn 时调用同名脚本即可，例如 `pnpm run dev`、`yarn dev`。项目不指定 `packageManager`，也不校验包管理器版本。仓库以 npm 和 `package-lock.json` 为准，使用 `npm ci` 安装锁定依赖。pnpm、Yarn 仍可安装运行并维护自己的锁文件，不需要先删除文件；实际业务仓库建议只维护所选工具的锁文件。

## 开发教程、变更与许可

- [新增业务页面完整流程](docs/new-business-page.md)：API、DTO、列表、表单、菜单权限、字典与中英文。
- [变更记录](CHANGELOG.md)：模板行为及生成器兼容要求。
- [MIT 许可证](LICENSE)：本项目源码的使用与分发许可；第三方依赖遵循各自许可证。
