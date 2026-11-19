# Npora Admin Template

一个简洁、可直接扩展业务的 Vue 3 后台框架模板。

技术栈：Vue 3、TypeScript、Element Plus、Pinia、Vue Router、Vite、`@npora/request`、Vue I18n 和 Day.js。

基础功能包含登录、首页、布局、动态菜单、标签页与页面缓存、用户/部门/角色/菜单/字典管理、按钮权限、个人中心、多语言、主题和移动端适配。表格与分页统一使用可配置的 `DataTable`，保留原生业务列插槽。

## 在线演示

[打开展示网站](https://admin.npora.live) · [演示 API 健康检查](https://api.npora.live/health)

演示账号：`admin`，密码：`123456`。公开演示账号的密码和验证器仅供登录体验。要试用改密、找回密码或验证器绑定，可在用户管理创建自己的测试账号。

演示接口为 `https://api.npora.live`；展示站内请求仍使用同源 `/api`。

## 创建项目

```sh
npx @npora/create-admin@latest my-admin
cd my-admin
npm install
npm run dev
```

按提示选择模板，默认是纯净后台；创建后可选择 npm、pnpm、Yarn 自动安装依赖，也可跳过。使用 `--yes --install npm` 可无交互创建并安装：

| 模板              | 内容                                             |
| ----------------- | ------------------------------------------------ |
| `starter`（默认） | 全部基础前端功能和正式 MySQL SQL，对接自己的后端 |
| `worker`          | 相同核心前端，附加独立 Worker 后端参考实现       |
| `demo`            | 完整展示网站、示例页面和测试后端                 |

也可通过 `--preset starter`、`--preset worker` 或 `--preset demo` 明确选择。生成器默认使用同版本模板 Tag，可用 `--ref main` 跟随开发分支。生成器按需组合目录，创建后无需删除演示文件；纯净版保留登录和首页，不附带 Mock 或 Worker 接口。所有预设都保留用户权限及字典 SQL。

新项目建议使用 Node.js 24 LTS。纯净版默认关闭 Google Authenticator，登录和系统管理数据由接入的后端提供。

[生成器用法](https://github.com/npora/create-admin) · [npm 包](https://www.npmjs.com/package/@npora/create-admin)

## 接入自己的后端

在 `.env.development.local` 设置开发代理目标：

```dotenv
VITE_API_URL=http://localhost:8080
```

启动自己的后端并运行 `npm run dev`。默认 `/api` 前缀在开发代理中移除后转发，生产由站点服务器转发。

- 请求函数与 DTO：`src/api/modules/`、`src/api/types/`。
- 响应协议：在 `src/api/protocol/index.ts` 统一适配，默认 `{ code: 0, message, data }`，调用方直接获得 `data`。
- 登录、动态菜单及管理接口：[接口契约](docs/api.md)。账号由自己的后端初始化。
- MySQL 新库运行 `sh database/mysql/init.sh --user root --password npora_admin` 一次导入表结构、基础权限、字典及索引。可选功能和已有库升级见 [正式 SQL](database/mysql/README.md)。

环境覆盖、认证与生产转发见 [开发配置](docs/development.md)、[后端接入](docs/backend-replacement.md) 和 [通用部署](docs/deployment.md)。完整源码仓库的核心模式应保持 `VITE_DEMO_ENABLED=false`；生成后的纯净版不需要该开关。

生产构建会生成 PWA 的 `sw.js`。浏览器检测到新版 Service Worker 等待激活后会提示刷新，确认后激活新版并重新加载网页。

## 应用设置与 Google Authenticator

时间显示默认北京时间（`Asia/Shanghai`），可在应用设置中切换 32 个常用时区（含巴基斯坦），偏好只保存在当前浏览器。默认值在 `src/config/datetime.ts`，枚举在 `src/types/timezone.ts`；时间区间统一使用 `DateRangePicker`，接口传 Unix 毫秒，详见 [日期与时区](docs/i18n.md#时区配置与时间区间)。

应用设置还可调整内容区切页动画，默认淡入淡出，可切换上下滑动或关闭。表单弹窗默认在视口中居中。

Google Authenticator 使用 TOTP 动态码，模板默认关闭。将前端 `.env` 的 `VITE_AUTHENTICATOR_ENABLED` 设为 `true` 可显示验证器入口。Worker 后端完成迁移后，设置 `AUTH_TOTP_ENABLED=true`，并通过后端私密配置提供 `AUTH_TOTP_KEY`。纯净版需要接入支持 TOTP 的自有后端。超级管理员可在“用户管理 → 更多 → 管理验证器”创建并立即启用，将仅本次显示的密钥交给用户添加到自己手机，即可使用动态码登录。用户可在个人中心自行解绑和重新绑定；后端加密密钥不进入前端配置，详见 [登录与账号安全](docs/authentication.md)。

已绑定验证器的用户可在登录页通过“忘记密码”自助重置。个人中心改密需要原密码，已绑定验证器时还需输入动态码，改密成功后重新登录。菜单管理只列出支持动态加载的业务页面，登录和忘记密码通过固定路由访问。

## 操作审计日志

有 `system:audit-log:list` 权限的用户可在“系统管理 → 操作审计日志”按操作和结果筛选。日志覆盖管理员重置密码、启停 Google Authenticator 和修改角色权限，保存操作者与目标 ID、结果、状态码和时间。

Worker 参考后端应用 `0011_audit_logs.sql` 后提供记录和查询。纯净版保留查询页，自有后端可应用 [MySQL 审计迁移](database/mysql/08-audit-logs.sql)，按 [审计接口契约](docs/api.md#操作审计日志) 接入。

## 运行本仓库

本仓库同时维护核心、演示和生成模板，和生成后的业务项目有所区别。

```sh
npm ci
npm run dev         # 核心模式，使用自己的后端
# 或 npm run dev:demo，体验连接演示 API 的完整展示
```

默认地址为 `http://localhost:3000`，以终端输出为准。`npm run dev:demo` 自动启用展示模式，需要网络，不自动启动或部署后端。

Node.js 最低要求见 `package.json`，建议使用受依赖支持的 LTS 版本。以 npm 和 `package-lock.json` 维护，使用者也可选择 pnpm 或 Yarn；不设置 `packageManager` 或强制其版本。

| 命令                    | 用途                   |
| ----------------------- | ---------------------- |
| `npm run build`         | 构建核心前端到 `dist/` |
| `npm run build:demo`    | 构建完整演示           |
| `npm run check`         | 核心格式、类型与测试   |
| `npm run check:all`     | 完整仓库检查           |
| `npm run check:presets` | 验证三种生成模板       |

生成项目仅保留所选模板的命令。`dist/`、缓存和本机 `.env.*.local` 不提交 Git。

## 目录与扩展

| 目录                 | 职责                                        |
| -------------------- | ------------------------------------------- |
| `src/`               | 核心前端，包含基础功能、API、状态和公共组件 |
| `database/mysql/`    | 正式权限、字典与索引 SQL，所有模板保留      |
| `public/`、`build/`  | 静态资源、构建与启动加载层                  |
| `scripts/`、`tests/` | 当前项目的运行与验证工具                    |
| `docs/`              | 开发、接口和使用说明                        |
| `examples/`          | 可选展示页面、数据及其专属逻辑              |
| `workers/api/`       | 可选独立后端，与核心前端实现分离            |
| `deploy/`            | 展示站部署实现，仅完整演示需要              |
| `scaffold/`          | 生成器差异文件，不进入生成项目              |

纯净版与 Worker 版只保留基础构建、类型和格式检查依赖，不包含额外压缩、体积分析和展示部署工具。核心代码只维护一份，目录组合与检查说明见 [模板预设维护](scaffold/README.md)。

[目录职责](docs/project-structure.md) · [新增业务页面与表格配置](docs/new-business-page.md) · [登录与账号安全](docs/authentication.md) · [权限模型](docs/rbac.md) · [字典](docs/dictionaries.md) · [多语言](docs/i18n.md) · [架构](docs/architecture.md) · [示例](docs/examples.md)

[变更记录](CHANGELOG.md) · [MIT 许可证](LICENSE)。第三方依赖遵循各自许可证。
