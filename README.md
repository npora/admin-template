# Npora Admin Template

基于 Vue 3、TypeScript、Element Plus、Pinia 和 Vue Router 的后台管理模板，使用 Vite 构建、`@npora/request` 请求接口。

内置可配置的中英文切换，联动 Element Plus、Day.js、日期格式、菜单和标签标题，详见 [多语言配置](docs/i18n.md)。

已实现动态路由、菜单、按钮权限、登录过期处理、主题与移动端布局、标签页与页面缓存，以及按 SQL 模型实现的用户多角色、角色管理、角色授权、部门树管理和菜单/按钮管理。首页按当前数据源提供实际汇总、最近用户、权限快捷入口和部门分布，支持浅色/深色与移动端布局。表格、下载与分步表单已提供完整前端示例，个人中心支持按账号保存本地资料和界面偏好。

## 在线演示

展示地址：[https://admin-demo.npora.workers.dev](https://admin-demo.npora.workers.dev)。当前演示账号：`admin`，密码：`123456`。

线上展示站通过服务绑定连接独立的 Worker + D1 测试 API，数据与本地 Mock 独立。部署命令、访问地址和自定义域名配置见 [Cloudflare 展示站部署](deploy/cloudflare/README.md)。

## 快速开始

独立前端需要 Node.js 22.12+ 和 pnpm，包管理器版本由 `packageManager` 固定；保留 Worker 并运行其 SQLite 测试时需要 Node.js 22.13+。

```sh
pnpm install
pnpm dev
```

默认地址为 `http://localhost:3000`，占用时 Vite 会选择下一个端口。开发模式开启 Mock，无需启动后端。

若本机已有 `.env.development.local`，其中配置会覆盖公共开发配置。五份环境文件各自的用途与优先级见 [环境配置说明](docs/development.md#为什么有多个-env-文件)；`.example` 仅供复制，不会自动加载。

以下是本地 Mock 的默认账号，线上 Worker 的账号以其初始化或维护结果为准。

| 账号     | 密码     | 能力                                         |
| -------- | -------- | -------------------------------------------- |
| `admin`  | `123456` | 超级管理员：用户、部门、角色、菜单和授权管理 |
| `viewer` | `123456` | 默认只读：首页与用户列表；写接口返回 403     |

Mock 数据只保存在当前页面运行时内存，刷新浏览器后恢复。用户、角色、菜单和授权共用同一组关系数据；新建用户可使用初始密码登录，禁用或删除用户后原 Token 失效。初始账号权限也会随角色分配和授权变化。

## 常用命令

| 命令                 | 用途                             |
| -------------------- | -------------------------------- |
| `pnpm dev`           | 开发服务                         |
| `pnpm run format`    | 统一格式                         |
| `pnpm run typecheck` | TypeScript 与 Vue 模板类型检查   |
| `pnpm test`          | 全部集成回归检查，不监听本地端口 |
| `pnpm run check`     | 格式、类型和全部回归检查         |
| `pnpm build`         | 类型检查与生产构建               |
| `pnpm preview`       | 预览生产产物，需要真实后端       |

`pnpm run check:standalone` 会验证不包含 `mock/` 和 `workers/` 的独立前端副本，检查类型、核心测试和生产构建。

原有 `check:session`、`check:views`、`check:errors`、`check:users` 命令保留，适合定向回归。

## 项目结构

```text
src/
  api/              请求客户端、插件、业务接口与 DTO
  assets/           图片、主题及全局样式
  components/       跨业务复用组件、统一表格与分页、工具栏
  composables/      组件使用的组合式逻辑
  config/           应用配置与环境变量规范化
  constants/        存储键、界面选项等常量
  directives/       权限指令
  icons/            图标注册表
  layout/           布局及其专属组件
  locales/          多语言资源、日期与数字格式
  router/           路由、守卫、错误跳转与转换工具
  services/         不依赖组件上下文的会话编排
  startup/          主 JS 加载前的品牌加载动画与失败重试
  store/            应用、用户、权限、标签和缓存状态
  types/            环境类型和生成的组件声明
  utils/            存储、权限判断等基础工具
  views/
    dashboard/      工作台、权限汇总与页面样式
    error/          错误页
    examples/       通用表格、分步表单、下载与缓存示例
    profile/        个人资料与界面偏好
    login/          登录
    system/         系统管理业务页面
  bootstrap.ts      应用初始化与资源清理
  main.ts           应用入口

tests/
  helpers/          共用测试环境
  integration/      独立前端的缓存、动画、多语言和基础能力回归
mock/               可删除的开发 Mock、SQL 内存模型及其测试
workers/api/        可删除的独立 Cloudflare 测试 API（认证、会话与权限）
deploy/cloudflare/  可选的前端 Cloudflare 展示站部署与 API 代理
public/             原样输出的静态资源，例如 favicon
build/              构建辅助与可选 Mock 适配器
scripts/            检查脚本；按目录存在性运行可选检查
docs/               架构、开发、接口与数据库说明
```

完整的目录职责、各子目录说明和裁剪步骤见 [项目目录与裁剪说明](docs/project-structure.md)。

| 裁剪对象                | 处理方式                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| `mock/`                 | 可整体删除；建议设置 `VITE_API_MOCK=false` 并配置真实接口                 |
| `workers/`              | 可整体删除本地后端示例；需要另有可用的后端，远程 Worker/D1 不会随文件删除 |
| `deploy/cloudflare/`    | 不用 Cloudflare 展示站时，可连同配置、部署命令和插件配套移除              |
| `src/views/examples/`   | 先清理静态路由、动态菜单、页面清单及测试，再删除演示页面                  |
| `dist/`、`.cloudflare/` | 构建产物，可重新生成，不提交 Git                                          |

`src/api/`、`build/`、`scripts/` 仍属于前端基础能力，删除演示后端时保留。

## 接入真实后端

`mock/` 和 `workers/` 都是可选演示目录，可以整体删除。前端无需修改导入；Mock 目录不存在时自动回退到真实请求，相关检查也会自动跳过。Worker 已实现 D1 认证、权限、首页汇总及四个管理模块，可作为独立测试后端。连接个人测试服务时建议使用不提交的 `.env.development.local` 覆盖配置，模板默认仍保留 Mock。具体步骤见 [删除演示代码与接入自有后端](docs/backend-replacement.md)。

将 `.env.development` 的 `VITE_API_MOCK` 改为 `false`，并通过 `VITE_API_URL` 设置开发代理目标。API 请求前缀默认 `/api`，默认业务响应为 `{ code: 0, message: 'success', data }`。

生产构建始终关闭 Mock。`VITE_API_URL` 仅用于开发代理；生产由部署服务器把 `VITE_API_PREFIX` 转发至后端。使用 HTML5 History 路由，需要将前端页面地址回退至 `index.html`，API 请求应单独转发。

- [前端业务示例、复用组件与个人中心](docs/examples.md)
- [多语言配置与新增词条](docs/i18n.md)
- [架构与模块职责](docs/architecture.md)
- [完整目录用途与可删除范围](docs/project-structure.md)
- [开发、环境变量与新增页面](docs/development.md)
- [生产部署与发布检查](docs/deployment.md)
- [Cloudflare 展示站部署](deploy/cloudflare/README.md)
- [浏览器验收结果与待验证项](docs/acceptance.md)
- [接口契约与用户 CRUD](docs/api.md)
- [数据库模型](docs/database/README.md)
- [SQL 映射、RBAC 与权限生效规则](docs/rbac.md)
