# 开发约定

## 启动与检查

- `npm run dev`：核心模式，连接自己的后端。
- `npm run dev:demo`：展示模式，加载独立演示模块并连接测试 API。
- `npm run check`：格式、类型与核心回归。
- `npm run check:examples`：演示页面测试。
- `npm run check:backend`：可选后端构建与回归，需要 Node.js 22.13+。
- `npm run check:all`：完整仓库维护检查。

没有 Mock 模式或 Mock 开关；所有业务请求走同一 HTTP 客户端。页面内部的任务数据、表单草稿不属于后端模拟。

## 代码与目录

核心业务页放在 `src/views/<业务>/<页面>/index.vue`，局部组件放在同目录 `components/`，局部逻辑放在 `useXxx.ts`。演示内容放在 `examples/pages/`，不直接加入核心静态路由。跨业务组件放在 `src/components/`，布局专属组件放在 `src/layout/components/`。

API 函数、DTO、协议分别位于 `src/api/modules/`、`src/api/types/`、`src/api/protocol/`。界面选项放在 `constants/`，基础逻辑放在 `utils/`；展示专属的统计 API 和 CSV 工具放在 `examples/`。

使用 `@/` 指向 `src/`，组件脚本 API 显式导入；Element Plus 模板组件按需注册。`src/types/generated/components.d.ts` 由开发服务或构建生成并提交，勿手改。服务式消息/弹窗需要确保样式已导入。

完整目录职责见 [项目结构](project-structure.md)。正式 SQL 独立在 [database/](../database/README.md)。

## 环境配置

### 为什么有多个 `.env` 文件

| 文件                             | 用途                                                    | 提交 |
| -------------------------------- | ------------------------------------------------------- | ---- |
| `.env`                           | 应用标题、前缀、Token 存储、构建选项和核心/展示默认开关 | 是   |
| `.env.development`               | 开发 API 代理目标，默认本机后端                         | 是   |
| `.env.production`                | 生产模式说明；生产使用同源 API 转发                     | 是   |
| `.env.development.local`         | 本机覆盖，连接个人服务或选择本机默认展示模式            | 否   |
| `.env.development.local.example` | 本机配置样例，不自动加载                                | 是   |

开发优先级从低到高：`.env`、可选 `.env.local`、`.env.development`、`.env.development.local`；生产替换为对应 production 文件。进程环境变量最高。修改后重启开发服务。

| 变量                  | 用途                                       |
| --------------------- | ------------------------------------------ |
| `VITE_APP_TITLE`      | 应用标题，默认 `Npora Admin`               |
| `VITE_API_PREFIX`     | 同源 API 前缀，默认 `/api`                 |
| `VITE_API_URL`        | 仅开发代理的目标地址                       |
| `VITE_DEMO_ENABLED`   | 默认 false；true 时加载 `examples/`        |
| `VITE_TOKEN_STORAGE`  | `session`、`local`、`memory`，默认 session |
| `VITE_BUILD_COMPRESS` | 默认 true，生成 gzip 产物                  |
| `VITE_BUILD_ANALYZE`  | 默认 false，启用后输出体积报告             |

`dev:demo` 和 `build:demo` 通过 `scripts/demo.mjs` 在进程环境开启展示功能，不改写环境文件。开发默认使用维护者的测试 API，可通过启动进程的 `VITE_API_URL` 覆盖。普通 `npm run dev` 仍遵循本机配置；本机已有 `VITE_DEMO_ENABLED=true` 时会进入展示模式。

生产的 `VITE_API_URL` 不会创建反向代理。任何 `VITE_*` 值都不能用于保存密码或服务端密钥。语言、日期与 Element Plus 配置仍放在 `src/config/i18n.ts` 和 `src/locales/`，见 [多语言](i18n.md)。

## 新增页面

1. 核心业务页放在 `src/views/`，演示页放在 `examples/pages/`。
2. 定义 DTO 和 API 函数；页面不直接发请求或判断后端实现。
3. 核心动态菜单的 `component` 相对于 `src/views/`，例如 `system/user/index`。演示模块保留 `examples/table/index` 等兼容标识，映射到独立示例目录。
4. 后端返回唯一的路由名称及该账号的实际权限；界面用 `v-permission` 或 `usePermission` 控制，接口权限由后端执行。
5. 按需设置 `keepAlive`、`fixedTab`、`hidden`、`activeMenu`、`routeQuery` 和 `order`。
6. 复杂行为增加适当回归。核心检查不要求演示后端可用，完整联调使用隔离测试数据库。

## 本地偏好与缓存

界面设置按字段校验，损坏或不可用的浏览器存储会降级，不保证跨刷新的持久化。个人资料与表单草稿按账号隔离。

遇到 `504 (Outdated Optimize Dep)` 或依赖目录下的动态模块加载失败时，停止开发服务，执行 `npm run dev --force` 后强制刷新；这是依赖预构建问题，不应靠修改权限或页面路径解决。测试使用独立临时缓存，不覆盖开发服务的预构建目录。

## 公共列表逻辑

`src/composables/useManagementTable.ts` 管理带关键词、状态与分页的权限列表，统一查询取消、过期响应隔离、末页回退以及保存和删除互斥。角色页面只配置 API，用户页面保留账号字段过滤、超级管理员删除保护及角色/部门选项加载；字典页面通过 `useDictionaryTable.ts` 补充字典缓存失效回调。树形菜单、部门继续保留业务专属逻辑；用户筛选通过筛选工厂扩展。演示用的 `usePaginatedTable.ts` 支持本地数据、排序和自定义筛选，职责不同，不耦合系统权限。

## 新业务与编辑表单

新增业务页面参照 [完整教程](new-business-page.md)。管理表单共用 `useFormSubmit`：保存规范化快照，未变化编辑直接关闭；校验期间及请求期间防止重复提交；关闭、重新打开或卸载后，旧校验结果不再提交。用户角色集合排序、菜单查询对象按键比较，避免仅顺序变化就发送更新。关闭或取消不刷新列表，实际写入成功由列表逻辑刷新一次。
