# Npora Admin Template

基于 Vue 3、TypeScript、Element Plus、Pinia 和 Vue Router 的后台管理脚手架，使用 Vite 构建，`@npora/request` 请求接口，Vue I18n 管理多语言，并同步 Element Plus、Day.js 和页面日期格式。

核心包含登录页、首页、后台布局、侧栏、导航、标签页、页面缓存、个人中心、主题、移动端适配、公共表格分页，以及用户、部门、角色、菜单、字典和按钮权限管理。字典类型、数据和公共组件的使用方式见 [字典管理](docs/dictionaries.md)。

## 在线演示

[打开 Npora Admin 展示网站](https://admin-demo.npora.workers.dev)

| 账号    | 密码     | 权限                                 |
| ------- | -------- | ------------------------------------ |
| `admin` | `123456` | 超级管理员，可体验系统管理和权限功能 |

这是展示站和默认测试 API 的演示账号，不是正式 SQL 自动创建的账号。

## 创建自己的后台项目

使用配套生成器：

```sh
npx @niping9542/create-nova-admin@latest
```

按提示输入项目名并选择模板，直接回车默认创建纯净版。

| 预设              | 前端页面                                   | 后端与演示内容                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------------- |
| `starter`（默认） | 登录页、核心首页、布局、系统管理和公共能力 | 对接自己的后端，不生成 Worker、示例页面和展示站部署工具 |
| `worker`          | 与纯净版相同                               | 额外生成独立 Worker 后端，菜单仅引用核心页面            |
| `demo`            | 登录页、美化演示首页、系统管理和示例页面   | 保留测试后端和展示站实现，开发默认使用现有测试 API      |

**纯净版保留登录页和首页，以及完整的核心后台功能。** 前端请求封装和 API 定义仍在，只是不附带 Worker 后端实现与演示模块。完成真实登录、加载动态菜单及管理数据，需要可用的后端接口。

明确创建纯净版：

```sh
npx @niping9542/create-nova-admin@latest my-admin --preset starter
cd my-admin
npm install
npm run dev
```

其他选项使用 `--preset worker` 或 `--preset demo`；原 `--demo` 等同 `--preset demo`。`--yes` 可跳过交互，未指定预设时使用纯净版。各预设按需生成目录、依赖和命令，无需创建后再删除演示文件。

三个预设均保留正式 MySQL 权限 SQL，不使用本地 Mock。Worker 版需要先初始化并运行自己的后端；生成器不自动安装依赖、执行 SQL、创建远程资源或部署。

[生成器源码与完整用法](https://github.com/ni9542/create-nova-admin) · [npm 包](https://www.npmjs.com/package/@niping9542/create-nova-admin)

## 本仓库与生成器的关系

| 项目                       | 职责                                               |
| -------------------------- | -------------------------------------------------- |
| `admin-template`（本仓库） | 维护核心前端、正式 SQL、演示模块及模板预设差异文件 |
| `create-nova-admin`        | 获取本仓库的模板，按选项生成项目并写入本机配置     |

本仓库是完整维护源码，包含 `examples/`、`workers/`、`deploy/` 和 `scaffold/`。生成后的纯净项目不包含这些目录。`scaffold/` 仅供生成器组合模板，不进入任何生成结果；核心页面只在 `src/` 维护一份。

## 直接运行本仓库

需要 Node.js 22.12.0+，后端检查需要 Node.js 22.13.0+。包管理器可选择 npm、pnpm 或 Yarn，不指定 `packageManager`。下面以 npm 为例。

### 体验完整演示

```sh
npm install
npm run dev:demo
```

开发地址默认 `http://localhost:3000`，端口以终端实际输出为准。该命令加载 `examples/` 中的美化首页、表格、表单、下载与缓存示例，通过真实 HTTP 连接测试 API，需要网络；不会自动启动或部署本地后端。

### 使用核心模式

在本仓库的 `.env.development.local` 中配置：

```dotenv
VITE_API_URL=http://localhost:8080
VITE_DEMO_ENABLED=false
```

然后启动自己的后端并运行：

```sh
npm run dev
```

登录页和首页保存在 `src/views/login/`、`src/views/dashboard/`。核心首页展示欢迎信息与当前账号有权访问的系统管理入口，不请求演示统计接口。核心模式不注册示例路由，完整仓库的可选目录可保留，不参与核心页面构建。

这里的 `VITE_DEMO_ENABLED` 用于完整源码仓库切换核心与演示模式。通过生成器得到的纯净版和 Worker 版不包含演示模块，不需要配置这个开关。

## 接入后端与生产构建

API 定义、DTO 和统一协议分别位于 `src/api/modules/`、`src/api/types/`、`src/api/protocol/`。后端按 [接口契约](docs/api.md) 实现认证、用户资料、动态路由及管理接口；响应格式不同可集中适配协议层。

`VITE_API_URL` 用于开发代理，默认请求前缀为 `/api`。开发代理移除前缀后转发；生产需要站点服务器将 `/api` 转发到实际后端，环境文件不会自动创建生产反向代理。

```sh
npm run build
```

普通构建类型检查并输出核心前端到 `dist/`。完整演示使用 `npm run build:demo`。构建产物不提交 Git，`npm run preview` 只预览静态产物，API 转发仍需自行提供。

环境文件用途与覆盖顺序见 [开发说明](docs/development.md)，后端切换见 [接入自己的后端](docs/backend-replacement.md)。

## 正式权限 SQL

[database/mysql/](database/mysql/README.md) 面向 MySQL 8.0.16+，所有预设都会保留。在空数据库按顺序导入：

1. `01-schema.sql`：用户、部门、角色、菜单及两张关联表，含索引、外键和状态约束。
2. `02-seed.sql`：基础部门、角色、系统管理菜单、按钮权限及授权。
3. `03-dictionaries.sql`：字典类型、数据、基础选项及对应权限。
4. `04-query-indexes.sql`：列表、状态筛选与树形查询的联合索引。

正式 SQL 不包含演示用户和示例菜单，不执行删表操作。管理员由自己的后端初始化，密码哈希采用该后端的算法。

`workers/api/migrations/` 是独立后端使用的 SQLite 迁移，与正式 MySQL SQL 分开维护和执行。正式 SQL 不依赖演示模块，接入自己的后端无需保留演示后端源码。

## 完整仓库目录

| 目录           | 用途                                           | 生成项目是否包含     |
| -------------- | ---------------------------------------------- | -------------------- |
| `src/`         | 登录、核心首页、布局、权限、系统管理和公共能力 | 全部预设             |
| `public/`      | 图标等原样输出的静态资源                       | 全部预设             |
| `build/`       | 公共构建配置、启动加载层和可选演示入口         | 按预设保留需要的文件 |
| `database/`    | 正式权限 SQL 和导入说明                        | 全部预设             |
| `scripts/`     | 开发、测试、预设更新与验证命令                 | 按预设保留需要的文件 |
| `tests/`       | 核心回归与共用测试辅助                         | 全部预设             |
| `docs/`        | 目录、开发、接口、权限和通用部署说明           | 按预设匹配说明       |
| `examples/`    | 独立演示入口、页面、统计 API、示例数据与测试   | 仅 `demo`            |
| `workers/api/` | 独立后端、SQLite 迁移、初始化脚本与测试        | `worker`、`demo`     |
| `deploy/`      | 展示站的部署实现                               | 仅 `demo`            |
| `scaffold/`    | 生成器使用的差异入口、依赖快照和说明           | 不进入生成项目       |

完整职责见 [项目目录说明](docs/project-structure.md)。`node_modules/`、`dist/` 和构建分析报告可以重新生成；本机 `.env.*.local`、后端密钥及账号资料不提交版本控制。

## 常用命令

以下命令以本仓库为准；生成项目只包含所选预设对应的命令。

| 命令                       | 用途                                         |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | 按本机配置启动前端，默认核心模式             |
| `npm run dev:demo`         | 展示开发，启用独立演示页面并默认连接测试 API |
| `npm run build`            | 类型检查并构建核心前端                       |
| `npm run build:demo`       | 类型检查并构建完整演示                       |
| `npm run preview`          | 预览最近生成的 `dist/`                       |
| `npm run check`            | 格式、类型与核心测试                         |
| `npm run check:views`      | 页面检查                                     |
| `npm run check:locales`    | 多语言检查                                   |
| `npm run check:examples`   | 演示页面和路由测试                           |
| `npm run check:backend`    | 独立后端构建与回归                           |
| `npm run check:all`        | 完整仓库回归，包括核心、演示、后端与代理     |
| `npm run check:standalone` | 验证不包含演示、后端与部署目录的独立前端副本 |
| `npm run update:presets`   | 同步纯净版依赖清单和锁文件快照               |
| `npm run check:presets`    | 通过相邻的生成器检查三个实际生成项目         |

## 自动检查

推送或提交 PR 时，GitHub Actions 检查完整源码、生产构建和独立前端副本，并在 Node.js 22、24 上联合当前生成器验证 `starter`、`worker`、`demo`。每个生成项目使用自己的锁文件安装依赖，再检查登录页与首页、文档链接、类型、测试和生产构建；Worker 预设额外验证后端。

生成项目会保留适合自身的 CI，不包含跨仓库的预设维护工作流。检查不会发布 npm 或部署服务。首次启用需先将两个仓库的配套改动推送到 `main`。

本机使用已有依赖快速验证：

```sh
npm run check:presets
```

按 CI 的方式独立安装三个项目的依赖：

```sh
node scripts/check-presets.mjs ../create-nova-admin --install
```

## 模板维护

核心代码在 `src/`，演示代码在 `examples/`，不复制维护三套业务页面。差异文件说明见 [scaffold/README.md](scaffold/README.md)。

修改依赖或核心命令后，在本仓库执行 `npm run update:presets` 并提交更新的快照。修改核心菜单或页面时，同时检查 Worker 预设的种子和页面白名单。若生成器位于相邻的 `../create-nova-admin` 且已安装自身依赖，可运行 `npm run check:presets` 验证三种生成结果。

模板内容推送到对应分支后，新创建的项目会获取该分支内容；已经生成的项目不会自动更新。生成器的参数、组合逻辑和 npm README 由生成器仓库维护并单独手动发布，推送 Git 不会自动发布 npm。

## 文档

- [项目目录与预设范围](docs/project-structure.md)
- [接入自己的后端](docs/backend-replacement.md)
- [开发与环境配置](docs/development.md)
- [架构与模块职责](docs/architecture.md)
- [正式数据库初始化](database/mysql/README.md)
- [接口契约](docs/api.md)
- [权限模型](docs/rbac.md)
- [多语言](docs/i18n.md)
- [演示页面与公共组件](docs/examples.md)
- [通用生产部署](docs/deployment.md)
- [验收记录](docs/acceptance.md)

## 包管理器

命令以 npm 为例，使用 pnpm 或 Yarn 时调用同名脚本即可，例如 `pnpm run dev`、`yarn dev`。项目不指定 `packageManager`，也不校验包管理器版本。仓库以 npm 和 `package-lock.json` 为准，使用 `npm ci` 安装锁定依赖。pnpm、Yarn 仍可安装运行并维护自己的锁文件，不需要先删除文件；实际业务仓库建议只维护所选工具的锁文件。

## 开发教程、变更与许可

- [新增业务页面完整流程](docs/new-business-page.md)：API、DTO、列表、表单、菜单权限、字典与中英文。
- [变更记录](CHANGELOG.md)：模板行为及生成器兼容要求。
- [MIT 许可证](LICENSE)：本项目源码的使用与分发许可；第三方依赖遵循各自许可证。

新版 npm 模板快照需要配套生成器 1.0.9 或更高版本。迁移顺序是先验证并手动发布生成器，再将 npm 版模板切换到默认分支，避免旧版创建命令读取不到锁文件。
