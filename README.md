# Npora Admin Template

基于 Vue 3、TypeScript、Element Plus、Pinia 和 Vue Router 的后台管理脚手架，使用 Vite 构建、`@npora/request` 请求接口。

核心保留登录、动态菜单、按钮权限、用户/部门/角色/菜单管理、主题、移动端布局、标签页、页面缓存、公共表格分页，以及可配置的中英文和日期格式。演示页面与测试后端独立维护，不需要通过删除目录来使用脚手架。

## 在线演示

展示网站：[Npora Admin 在线体验](https://admin-demo.npora.workers.dev)。

| 账号    | 密码     | 权限                                 |
| ------- | -------- | ------------------------------------ |
| `admin` | `123456` | 超级管理员，可体验系统管理和权限功能 |

这是展示站的演示账号，不是导入正式 SQL 后自动创建的账号。

## 快速体验

需要 Node.js 22.12+ 和项目指定版本的 pnpm。在仓库根目录执行：

```sh
pnpm install
pnpm dev:demo
```

开发地址默认 `http://localhost:3000`。展示模式加载 `examples/` 中的美化首页、表格、表单、下载与缓存示例，通过真实 HTTP 请求访问测试 API，需要网络。没有本地内存 Mock，也不会自动启动或部署测试后端。

## 作为自己的后台脚手架使用

在 `.env.development.local` 配置自己的后端地址：

```dotenv
VITE_API_URL=http://localhost:8080
VITE_DEMO_ENABLED=false
```

然后运行：

```sh
pnpm dev
```

核心模式不注册示例路由，首页只提供欢迎信息和获授权的系统管理入口。`examples/`、`workers/`、`deploy/` 均可留在仓库，不参与普通前端构建。后端按 [接口契约](docs/api.md) 实现认证、用户资料、动态路由和管理接口；更换响应格式时集中调整 `src/api/protocol/`。

普通生产构建执行 `pnpm build`，产物为 `dist/`。生产环境通过站点服务器将 `/api` 转发至自己的后端；`VITE_API_URL` 仅用于开发代理。环境文件用途与覆盖顺序见 [开发说明](docs/development.md)。

## 正式权限 SQL

独立保存在 [database/mysql/](database/mysql/README.md)，适用 MySQL 8.0.16+：

1. `01-schema.sql`：用户、部门、角色、菜单及两张关联表，含索引、外键和状态约束。
2. `02-seed.sql`：基础角色、系统管理菜单、按钮权限及授权。

在空数据库按顺序导入，不包含展示用户和示例菜单，不执行删表操作。管理员账号由自己的后端初始化，密码哈希采用该后端的算法。演示代码的移动或删除不影响正式 SQL。

## 项目结构

```text
src/          脚手架核心与用户、部门、角色、菜单管理
examples/     独立演示入口、页面、统计 API、示例数据与测试
workers/api/  独立测试后端，供展示站及维护者使用
database/    正式权限 SQL（与演示实现无关）
deploy/       展示站的可选部署实现
public/       网站图标等原样输出的静态资源
build/        启动加载层和演示入口的构建辅助
scripts/      开发、测试、独立前端验证等命令
tests/       脚手架核心回归与共用测试辅助
docs/        使用、接口、架构和目录说明
```

完整职责见 [项目目录说明](docs/project-structure.md)。核心不直接导入演示文件：构建插件在核心模式提供空演示入口，在展示模式加载 `examples/index.ts`。

## 常用命令

| 命令                        | 用途                                               |
| --------------------------- | -------------------------------------------------- |
| `pnpm dev`                  | 核心开发，连接配置的后端                           |
| `pnpm dev:demo`             | 展示开发，使用独立演示页面和测试 API               |
| `pnpm build`                | 类型检查并构建核心前端                             |
| `pnpm build:demo`           | 类型检查并构建展示前端                             |
| `pnpm preview`              | 预览最近生成的 `dist/`，仍需可用的 API 转发        |
| `pnpm run check`            | 格式、类型与核心测试                               |
| `pnpm run check:examples`   | 演示页面和路由测试                                 |
| `pnpm run check:backend`    | 可选测试后端的构建与测试，需要 Node.js 22.13+      |
| `pnpm run check:all`        | 完整仓库回归，包括核心、演示、后端和部署代理       |
| `pnpm run check:standalone` | 验证不含演示页面、测试后端和部署实现的独立前端副本 |

## 文档

- [项目目录与可选部分](docs/project-structure.md)
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
