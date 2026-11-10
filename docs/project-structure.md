# 项目目录与裁剪说明

本文说明当前仓库各目录的用途，以及接入自己的后端、移除演示功能时需要保留或同步调整的内容。这里只提供裁剪说明，不会自动删除任何目录。

## 根目录

| 目录            | 用途                                                      | 是否可以删除                                                   |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `src/`          | Vue 前端源码，包含页面、请求、状态、权限与布局            | 核心目录，保留                                                 |
| `public/`       | 原样复制到构建产物的静态文件；当前包含网站图标和 SVG 资源 | 替换或移除引用后可裁剪；例如 `index.html` 引用了 `favicon.svg` |
| `build/`        | Vite 构建辅助：启动加载层内联、可选 Mock 虚拟模块         | 保留；`vite.config.ts` 直接导入这里的插件                      |
| `scripts/`      | 根项目测试收集、可选模块检查、独立前端验证                | 保留；`package.json` 的检查命令依赖它                          |
| `tests/`        | 不依赖演示后端的前端核心回归与测试辅助                    | 建议保留；不影响生产运行，删除需调整检查命令和其他测试引用     |
| `mock/`         | 可选的浏览器内存接口，用于无后端开发和演示                | 可整体删除，详见下文                                           |
| `workers/`      | 可选的独立 Worker + D1 测试后端，目前只有 `api/`          | 可整体删除；线上 API 需另行安排                                |
| `deploy/`       | 展示站部署实现，目前只有 `cloudflare/`                    | 不采用该部署方案时可配套移除                                   |
| `docs/`         | 开发、架构、接口、数据库、部署与验收文档                  | 不参与运行；可以裁剪，但应同步修复 README 等文档链接           |
| `.vscode/`      | VS Code 扩展推荐                                          | 可删除，不影响运行                                             |
| `.idea/`        | 本机 JetBrains IDE 配置，已忽略提交                       | 可删除，不影响运行，IDE 可能重新生成                           |
| `node_modules/` | 安装的依赖及部分工具缓存                                  | 可重新安装，不是源码；删除后执行 `pnpm install`                |
| `dist/`         | 普通前端构建产物                                          | 可重新生成；不要提交 Git，`pnpm build` 生成                    |
| `.cloudflare/`  | Cloudflare 构建和工具产物                                 | 可重新生成；部署前重新执行 `pnpm run build:cloudflare`         |
| `.wrangler/`    | Cloudflare 工具的本地状态或缓存（使用相关工具时可能出现） | 确认不需要其中本地状态后可清理，不是业务源码                   |
| `.git/`         | Git 历史、分支与版本控制元数据                            | 保留，不属于模板功能裁剪范围                                   |

`coverage/`、`.pnpm-store/`、日志目录等若由本地工具生成，属于报告或缓存，不作为应用源码维护。清理缓存前停止相关开发进程；报告需要时重新运行对应工具。

## 前端源码 `src/`

| 目录                               | 职责与内容                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/`                             | 所有业务 HTTP 调用的入口，页面通过 API 模块访问后端                                                                                                                                                                 |
| `api/auth/`                        | Token 存储与会话版本；认证插件读取这里的 Token                                                                                                                                                                      |
| `api/errors/`                      | 业务错误类型、错误分类、通知处理器注入和去重                                                                                                                                                                        |
| `api/modules/`                     | 登录、路由、首页、用户、角色、部门、菜单等接口函数                                                                                                                                                                  |
| `api/plugins/`                     | 应用层请求插件：统一协议解包、最终错误处理与请求时的会话快照                                                                                                                                                        |
| `api/protocol/`                    | 后端响应协议适配；换后端时集中调整 `code/message/data` 映射                                                                                                                                                         |
| `api/types/`                       | 接口请求和业务响应 DTO、分页类型；更换后端后仍然需要                                                                                                                                                                |
| `assets/`                          | 由源码引用、交给 Vite 处理的资源                                                                                                                                                                                    |
| `assets/images/`                   | 页面图片位置；是否可删以实际 import 和 URL 引用为准                                                                                                                                                                 |
| `assets/styles/`                   | 主题变量、重置、滚动条、Element Plus 覆盖和过渡样式                                                                                                                                                                 |
| `components/`                      | 跨页面共享的组件，不放某个业务页专属弹窗                                                                                                                                                                            |
| `components/DataTable/`            | 统一表格、边框、加载/空状态与可选分页                                                                                                                                                                               |
| `components/TablePagination/`      | 默认居中的分页，供表格复用                                                                                                                                                                                          |
| `components/TableToolbar/`         | 表格标题、刷新、密度、列显隐及操作插槽                                                                                                                                                                              |
| `components/LocaleSwitch/`         | 多语言切换图标与选择入口                                                                                                                                                                                            |
| `components/PagePlaceholder/`      | 占位说明组件，当前缓存示例使用                                                                                                                                                                                      |
| `composables/`                     | Vue 组合式逻辑，例如分页查询、会话使用入口                                                                                                                                                                          |
| `config/`                          | 应用配置、环境变量读取及 API 前缀规范化                                                                                                                                                                             |
| `constants/`                       | 存储键、组件尺寸和界面选项等常量                                                                                                                                                                                    |
| `directives/permission/`           | 按钮权限指令；前端隐藏按钮，后端仍需校验接口权限                                                                                                                                                                    |
| `icons/`                           | 菜单等位置使用的图标注册与解析                                                                                                                                                                                      |
| `layout/`                          | 后台整体布局                                                                                                                                                                                                        |
| `layout/components/`               | 布局专属组件：`AppHeader` 顶栏、`AppSidebar` 侧栏、`AppMenu` 菜单、`AppMenuItem` 菜单节点、`AppLogo` 标识、`AppBreadcrumb` 面包屑、`AppTabs` 标签页、`AppMain` 页面容器、`AppUser` 用户菜单、`AppSettings` 设置面板 |
| `locales/`                         | i18n 初始化、语言注册、偏好策略、错误翻译及日期/数字格式                                                                                                                                                            |
| `locales/zh-CN/`、`locales/en-US/` | 按 UI、路由、错误、表格、表单、个人中心等主题拆分的翻译资源                                                                                                                                                         |
| `router/`                          | Router 创建、路由类型与工具                                                                                                                                                                                         |
| `router/routes/`                   | 静态路由，包括登录、首页、个人中心、表单示例和错误页                                                                                                                                                                |
| `router/guards/`                   | 登录校验、会话恢复与动态路由初始化                                                                                                                                                                                  |
| `router/utils/`                    | 后端路由 DTO 转换、页面解析及路由校验等工具                                                                                                                                                                         |
| `services/`                        | 会话初始化、退出和权限刷新等编排，不依赖组件生命周期                                                                                                                                                                |
| `startup/`                         | 主 JS 就绪前的启动加载层 HTML/CSS/JS，由构建插件内联                                                                                                                                                                |
| `store/`                           | Pinia 注册与跨页面状态                                                                                                                                                                                              |
| `store/modules/`                   | 按业务拆分的状态模块，另有 `locale.ts` 管理语言偏好                                                                                                                                                                 |
| `store/modules/app/`               | 主题、布局、响应式状态、组件尺寸与界面设置                                                                                                                                                                          |
| `store/modules/user/`              | 认证资料、权限及用户显示信息                                                                                                                                                                                        |
| `store/modules/permission/`        | 已授权动态路由、菜单与初始化状态                                                                                                                                                                                    |
| `store/modules/tabs/`              | 已访问标签、固定标签与标签操作                                                                                                                                                                                      |
| `store/modules/views/`             | 页面缓存状态及 KeepAlive 管理                                                                                                                                                                                       |
| `store/modules/profile/`           | 按账号隔离的本地个人资料；用户显示信息和表单草稿也引用这里的能力                                                                                                                                                    |
| `types/`                           | 环境变量、i18n、可选 Mock 虚拟模块等声明                                                                                                                                                                            |
| `types/generated/`                 | 自动组件类型声明；由 Vite 组件插件生成，勿手工修改，也不要在仅运行类型检查前随意删除                                                                                                                                |
| `utils/`                           | 权限判断、CSV、日期等基础工具                                                                                                                                                                                       |
| `utils/storage/`                   | 浏览器存储封装及不可用时的降级                                                                                                                                                                                      |
| `views/`                           | 路由页面与页面专属逻辑，详见下表                                                                                                                                                                                    |

`api/client.ts` 创建公共和认证客户端；`bootstrap.ts` 负责初始化及清理；`main.ts` 是应用入口；`App.vue` 是根组件。这些属于框架入口，接入自有后端时通常保留。

### 页面目录

| 目录                       | 内容                                                               | 裁剪注意事项                                                           |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `views/login/`             | 登录页                                                             | 默认认证流程需要，替换认证方案时同步修改守卫与会话服务                 |
| `views/dashboard/`         | 首页汇总、权限快捷入口和最近数据                                   | 默认首页直接引用；替换时调整根重定向、固定标签及首页接口               |
| `views/error/`             | 404 与路由兜底页面                                                 | 默认路由依赖，保留或替换                                               |
| `views/system/`            | 系统管理页面集合                                                   | 属于示范业务，可按自己的业务逐模块替换；不是可直接整目录删除的独立后端 |
| `views/system/user/`       | 用户列表、筛选、分页、编辑及管理 composable                        | 业务专属 `components/` 保存用户表单弹窗                                |
| `views/system/department/` | 部门树、树工具、编辑与管理 composable                              | 业务专属 `components/` 保存部门表单弹窗                                |
| `views/system/role/`       | 角色列表、编辑及授权逻辑                                           | 业务专属 `components/` 保存角色表单与授权弹窗                          |
| `views/system/menu/`       | 菜单/按钮树、编辑与管理 composable                                 | 业务专属 `components/` 保存菜单表单弹窗                                |
| `views/examples/`          | 通用前端示例，不是请求 Mock 实现                                   | 可裁剪，需同步清理路由、菜单与测试                                     |
| `views/examples/table/`    | 本地任务表格、分页、排序、编辑、导出；`components/` 为任务表单弹窗 | 表格示例由动态路由授权                                                 |
| `views/examples/form/`     | 分步表单、校验与本地草稿                                           | 静态路由直接 import，删除前必须移除路由                                |
| `views/examples/download/` | 本地文件下载示例                                                   | 需移除对应动态菜单/页面入口                                            |
| `views/examples/cache/`    | 页面缓存演示                                                       | 需检查路由和测试中的页面引用                                           |
| `views/profile/`           | 个人中心、本地资料和偏好                                           | 静态路由及顶栏用户菜单均有入口；移除页面不等于能直接删除 profile store |

管理页面中的 `components/` 是该页面的局部组件。仅当多个业务页面共同使用时，再移入顶层 `src/components/`。

## 可选后端、部署与测试目录

| 目录                            | 用途                                                           | 删除条件                                                                                 |
| ------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `mock/modules/`                 | 登录、路由及各管理接口的内存处理器                             | 随整个 `mock/` 删除最简单                                                                |
| `mock/rbac/`                    | SQL 风格内存表、种子、DTO 与权限计算                           | Mock 处理器依赖它，勿单独删除后继续启用 Mock                                             |
| `mock/tests/`                   | 依赖 Mock 的会话、错误、权限与 CRUD 集成测试                   | 随 `mock/` 删除后，根测试自动跳过                                                        |
| `workers/api/src/`              | Worker 运行时源码，HTTP 分发与统一响应                         | 随后端示例整体移除，或复制为独立项目                                                     |
| `workers/api/src/config/`       | 后端允许引用的前端页面入口清单                                 | 删除前端页面时，保留 Worker 的项目需同步维护该清单                                       |
| `workers/api/src/modules/`      | 认证、首页与管理接口处理、输入校验和 DTO                       | 保留 Worker 时保留                                                                       |
| `workers/api/src/repositories/` | D1 参数化查询与事务批处理                                      | 保留 Worker 时保留                                                                       |
| `workers/api/src/security/`     | 密码、会话授权、限流与路由生成                                 | 保留 Worker 时保留                                                                       |
| `workers/api/migrations/`       | SQLite 建表、种子和增量迁移                                    | 保留 Worker 时保留，不要当作缓存清理                                                     |
| `workers/api/scripts/`          | 初始化本机凭据、生成一次性 SQL 和单文件构建                    | Worker 工具命令依赖                                                                      |
| `workers/api/tests/`            | Worker 单元和 SQLite 集成测试；`helpers/` 是测试服务与数据辅助 | 随 Worker 移除                                                                           |
| `workers/api/integration/`      | 完整仓库中，真实前端请求客户端对接 Worker 的联调测试           | 随 Worker 移除，不属于独立 Worker 包的测试入口                                           |
| `workers/api/.local/`           | 本机账号凭据、`AUTH_PEPPER` 和初始化 SQL，忽略提交             | **不是可随意清理的缓存**；已有测试库仍需这些资料时应妥善保留，不要重建 pepper 来重置密码 |
| `workers/api/dist/`             | 可粘贴到控制台的 `worker.js` 打包产物                          | 可重新构建，不提交 Git                                                                   |
| `deploy/cloudflare/`            | 前端静态站构建与 `/api` 服务绑定代理，不是业务 API 后端        | 不用该部署方案时配套移除                                                                 |
| `deploy/cloudflare/tests/`      | 服务绑定代理的路径边界、转发和错误回归                         | 随部署实现移除后，根测试自动跳过                                                         |
| `tests/helpers/`                | Vite 转换环境、内存存储和测试路由辅助                          | 核心测试与部分 Mock/Worker 联调测试共同引用，建议保留                                    |
| `tests/integration/`            | 独立前端的请求、路由、动画、加载、多语言、组件等回归           | 建议保留；裁剪页面后同步调整相关测试                                                     |
| `docs/database/`                | SQL 结构设计与模型说明，供实现后端参考                         | 文档与设计参考，不会自动执行；Worker 实际迁移另在 `workers/api/migrations/`              |

表中未单独标注删除条件的 Worker 源码子目录均由其入口引用，不能在继续使用 Worker 时随意删除。

## 常见裁剪方案

### 连接 Worker，停用 Mock

设置 `VITE_API_MOCK=false`，通过 `VITE_API_URL` 指向 Worker，并重启开发服务。`mock/` 可保留不加载，也可以整体删除；保留 `build/optional-mock.ts` 和 `src/types/mock-adapter.d.ts`，它们提供“目录不存在也能运行”的边界。

生产构建始终禁用 Mock。`@npora/request` 是 HTTP 客户端，不要求项目存在 `mock/`。

### 接入自己的后端

可以整体删除 `mock/`、`workers/`，保留 `src/api/`，按自己的接口调整 API 模块、DTO 和响应协议。开发代理、生产代理与认证契约的完整步骤见 [接入自有后端](backend-replacement.md)。

删除本地目录不会删除或停用已经部署在 Cloudflare 上的 Worker、D1 或服务绑定。若前端仍部署在 Cloudflare，必须让 `cloudflare.config.ts` 中的 `API` 服务绑定指向实际可用的后端，或相应替换代理实现；删除 Worker 示例源码不会自动替换远程服务。

### 不使用 Cloudflare 部署前端

可以配套删除 `deploy/cloudflare/` 与根目录 `cloudflare.config.ts`，然后：

1. 从 `package.json` 移除 `build:cloudflare`、`check:cloudflare`、`deploy:cloudflare` 三个命令。
2. 从 `vite.config.ts` 移除 `NPORA_CLOUDFLARE_BUILD` 条件导入及 `cloudflarePlugin` 插件项。
3. 若后续没有其他用途，可移除根开发依赖 `cf`、`@cloudflare/vite-plugin`，并用包管理器更新锁文件。
4. 从 `tsconfig.node.json` 的 `include` 移除 `cloudflare.config.ts`，清理 `.env*` 中不再使用的 Cloudflare 专用配置及文档链接。
5. 在自己的服务器配置 API 转发和 History 页面回退，执行 `pnpm run check`、`pnpm build`。

`build/` 与 `scripts/` 仍供普通 Vite 构建和检查使用，应保留。`pnpm-workspace.yaml` 还包含其他依赖的构建许可，不应因为移除 Cloudflare 就直接整份删除。

### 移除表格、表单、下载等演示页面

先移除 `src/router/routes/constant.ts` 中的表单路由，再清理后端返回的示例菜单及页面入口。若保留 Mock/Worker，也需调整它们的种子、页面允许清单和相关测试；已部署数据库里的菜单记录应通过管理功能或迁移修改，不要重新执行初始化 SQL。

随后删除不需要的 `src/views/examples/` 子目录，按实际引用清理示例词条、草稿状态、工具函数及测试。表格、分页、工具栏等组件仍被首页和管理模块使用，不应随着演示页面一起删除。移除个人中心或管理模块时也遵循“先入口、再引用、后源码”的顺序。

## 配置文件与生成文件

| 文件                                                                 | 用途与处理方式                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `.env`、`.env.development`、`.env.production`                        | 公共、开发与生产配置，保留；用途和覆盖关系见 [环境配置](development.md#为什么有多个-env-文件) |
| `.env.development.local`                                             | 本机覆盖配置，忽略提交；删除后恢复公共配置，需重启开发服务                                    |
| `.env.development.local.example`                                     | 本机配置样例，不会被 Vite 自动加载；可随相关接入说明裁剪                                      |
| `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`              | 项目命令、依赖与锁定结果、依赖构建许可；正常开发保留                                          |
| `vite.config.ts`、`tsconfig*.json`、`index.html`                     | 构建、类型检查与 HTML 入口；保留或随整体技术方案调整                                          |
| `cloudflare.config.ts`                                               | 可选前端 Cloudflare 部署配置，需按上述步骤配套移除                                            |
| `.gitignore`、`.editorconfig`、`.prettierrc.json`、`.prettierignore` | Git 忽略规则、编辑和格式约定；建议保留                                                        |
| `report.html`                                                        | 开启构建分析后生成的体积报告，可删除，不提交 Git                                              |

不要把 `src/types/`、`build/`、`scripts/` 当作生成目录整体删除。当前仅组件声明等指定文件由工具生成，其余包含项目自身维护的代码。

## 裁剪后的验证

只删除可选后端、部署实现时，可运行：

```sh
pnpm run check
pnpm build
pnpm run check:standalone
```

`check:standalone` 在临时目录中复制前端，明确排除 `mock/`、`workers/`、`deploy/` 和 `cloudflare.config.ts`，验证类型、核心测试及普通构建，不会删除工作区文件，也不会验证真实后端可用性。

根检查脚本按目录存在性发现 Mock、Worker、Cloudflare 代理的检查与测试。若裁剪了业务页面，应同步更新相关测试，并实际验证登录、菜单、直接访问页面和退出流程。继续使用 Cloudflare 部署时，另执行 `pnpm run build:cloudflare` 与 `pnpm run check:cloudflare`。
