# 开发约定

## 代码与目录

目录职责与裁剪指南见 [项目目录与裁剪说明](project-structure.md)，包括 Mock、Worker、Cloudflare 部署、示例页面与生成产物的区别。

- 页面统一使用 `views/<业务>/<页面>/index.vue`；页面专属组件放在同目录 `components`，专属业务逻辑放在同目录的 `useXxx.ts`。
- 只有跨业务使用的组件才放进 `src/components`。布局组件保留在 `layout/components`。
- Vue、Vue Router、Pinia 和 Element Plus 的脚本 API 使用显式导入。Element Plus 的模板组件与指令由 `unplugin-vue-components` 按需注册。
- Element Plus 服务函数若在新模块单独使用，需要同时确保其样式已加载。全局消息样式由路由初始化加载，用户管理单独加载确认框样式。
- 统一使用 `@/` 指向 `src`。相邻小模块可用相对导入，不再维护重复别名。
- `.editorconfig` 与 Prettier 统一编码、换行、引号和排版。修改完成后运行 `pnpm run check` 和 `pnpm build`。
- `src/types/generated/components.d.ts` 由开发服务或 Vite 构建生成，应提交到版本控制；不要手动修改。新增组件后先运行开发服务或 Vite 构建更新声明。

## 环境变量

`.env` 提供通用默认值，`.env.development` 和 `.env.production` 按模式覆盖；个人配置使用被 Git 忽略的 `.env.local` 或 `.env.development.local`。前端 `VITE_` 变量会进入浏览器，不用于保存秘密。

### 为什么有多个 `.env` 文件

| 文件                             | 是否提交 | 作用                                               |
| -------------------------------- | -------- | -------------------------------------------------- |
| `.env`                           | 是       | 所有模式共用的默认值，例如标题、API 前缀与存储方式 |
| `.env.development`               | 是       | `pnpm dev` 的公共配置，模板默认启用 Mock           |
| `.env.production`                | 是       | `pnpm build` 的公共配置，关闭 Mock                 |
| `.env.development.local`         | 否       | 本机开发覆盖；连接个人 Worker 或自己的后端时使用   |
| `.env.development.local.example` | 是       | 配置示例，不会自动加载；需要时复制为上一项         |

前三份是模板公共配置；后两份用于个人开发和提供复制示例，无需把同一组变量复制到所有文件。`.local` 不是额外一种运行环境。

开发配置从低到高依次是 `.env`、可选的 `.env.local`、`.env.development`、`.env.development.local`；生产模式改为 `.env.production` 和可选的 `.env.production.local`。同名变量由更高优先级覆盖，启动命令已经提供的环境变量优先于这些文件。

因此 `.env.development` 中 Mock 为 `true`，本机 `.env.development.local` 中为 `false` 时，实际连接真实接口。需要回到 Mock 时，把本机覆盖文件改为 `VITE_API_MOCK=true`；若本机覆盖已无用途，也可移除该文件。修改环境文件后重启 Vite。开发覆盖文件不会被生产构建加载。

应用层的多语言开关、支持语言和日期格式在 `src/config/i18n.ts` 与 `src/locales/` 维护，不需要再增加一套环境文件，详见 [多语言配置](i18n.md)。

| 变量                  | 默认值 / 用途                                      |
| --------------------- | -------------------------------------------------- |
| `VITE_APP_TITLE`      | `Npora Admin`，应用标题                            |
| `VITE_API_PREFIX`     | `/api`，站内非根路径前缀，尾部斜线自动移除         |
| `VITE_API_URL`        | `http://localhost:8080`，仅开发代理的后端目标      |
| `VITE_API_MOCK`       | 通用默认 false、开发默认 true，生产始终不加载 Mock |
| `VITE_TOKEN_STORAGE`  | `session`，可选 `local`、`memory`                  |
| `VITE_BUILD_COMPRESS` | true，额外生成 gzip 文件                           |
| `VITE_BUILD_ANALYZE`  | false，启用后输出 `report.html`                    |

本地设置按字段验证并与默认值合并；JSON 损坏时回到默认值。浏览器存储不可用或配额耗尽时，对应存储适配器退回当前页面内存，不具备跨刷新的持久化能力。

## 新增业务页面

1. 在 `src/views/<业务>/<页面>/index.vue` 添加页面。
2. 在 `api/types` 定义 DTO，在 `api/modules` 封装请求。界面标签与选项放在 `constants`。
3. 开发阶段通过菜单管理维护目录、页面和按钮，初始内存表位于 `mock/rbac/database.ts`；`component` 使用不带 `.vue` 的页面路径。需要新增模拟接口时在 `mock/modules` 实现并在 `mock/index.ts` 安装。
4. 后端返回该账号获准的路由和权限码。页面路由应有唯一 `name`，按钮用 `v-permission` 或 `usePermission` 控制；接口授权仍由后端执行。
5. 通过 `keepAlive`、`fixedTab`、`hidden`、`activeMenu`、`alwaysShow`、`routeQuery` 和 `order` 配置页面行为。未填写 `order` 的项排最后。
6. 复杂状态转换在 `tests/integration` 增加回归检查；保留真实请求封装，避免只验证实现细节。

## 验证与部署

`pnpm run check` 依次执行格式、类型和全部集成检查；`pnpm build` 生成 `dist`。CI 执行同一组命令并使用锁文件安装。

生产预览不启用 Mock，需要已配置后端转发。部署时同时配置前端 History 回退和 API 转发，不应把 API 404 回退成前端 HTML。gzip 产物需要部署服务器配置后才会被采用。

Mock 密码演示使用 Web Crypto，开发时使用 localhost 或 HTTPS。角色、授权和菜单变更会立即影响 Mock 接口鉴权；当前前端菜单和按钮可通过用户菜单的“刷新权限”同步，刷新时会清理旧标签与页面缓存。

## 开发依赖缓存失效

若控制台出现 `504 (Outdated Optimize Dep)` 或 `Failed to fetch dynamically imported module`，且失败地址位于 `node_modules/.vite/deps`，应先检查 Vite 预构建缓存，而不是修改页面权限或路由地址。停止现有开发服务后执行 `pnpm dev --force`，再强制刷新浏览器即可重新获取依赖版本，参见 [Vite 缓存说明](https://vite.dev/guide/dep-pre-bundling#caching)。

集成测试通过共用 helper 创建 Vite 服务，使用每次独立的临时缓存目录并禁用客户端依赖预构建；测试结束清理自己的临时目录，不应操作开发服务的 `node_modules/.vite`。首页 Skeleton 按需组件已加入开发预构建列表。
