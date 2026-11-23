# 开发约定

## 启动与检查

- `npm run dev`：核心模式，连接自己的后端。
- `npm run dev:demo`：展示模式，加载独立演示模块并连接测试 API。
- `npm run check`：格式、类型与核心回归。
- `npm run check:examples`：演示页面测试。
- `npm run check:backend`：可选后端构建与回归，需要 Node.js 22.13+。
- `npm run check:all`：完整仓库维护检查。

源码仓库的浏览器回归单独在 CI 运行，覆盖登录后的深层页面刷新、角色授权生效和会话撤销。测试使用本机隔离数据库，运行方法见源码仓库的 `tests/browser/README.md`。

没有 Mock 模式或 Mock 开关；所有业务请求走同一 HTTP 客户端。页面内部的任务数据、表单草稿不属于后端模拟。

## 代码与目录

核心业务页放在 `src/views/<业务>/<页面>/index.vue`，局部组件放在同目录 `components/`，局部逻辑放在 `useXxx.ts`。演示内容放在 `examples/pages/`，不直接加入核心静态路由。跨业务组件放在 `src/components/`，布局专属组件放在 `src/layout/components/`。

API 函数、DTO、协议分别位于 `src/api/modules/`、`src/api/types/`、`src/api/protocol/`。界面选项放在 `constants/`，基础逻辑放在 `utils/`；展示专属的统计 API 和 CSV 工具放在 `examples/`。

使用 `@/` 指向 `src/`，组件脚本 API 显式导入；Element Plus 模板组件按需注册。`src/types/generated/components.d.ts` 由开发服务或构建生成并提交，勿手改。服务式消息/弹窗需要确保样式已导入。

完整目录职责见 [项目结构](project-structure.md)。正式 SQL 独立在 [database/](../database/README.md)。

## 环境配置

| 文件               | 用途                                                    | 提交 |
| ------------------ | ------------------------------------------------------- | ---- |
| `.env`             | 应用标题、前缀、Token 存储、构建选项和核心/展示默认开关 | 是   |
| `.env.development` | 开发 API 代理目标，默认本机后端                         | 是   |
| `.env.production`  | 生产模式说明；生产使用同源 API 转发                     | 是   |

同名变量优先使用进程环境，其次是当前模式文件，最后是 `.env`。开发配置修改后重启 Vite。个人临时覆盖可通过启动进程的环境变量传入。

| 变量                          | 用途                                               |
| ----------------------------- | -------------------------------------------------- |
| `VITE_APP_TITLE`              | 应用标题，默认 `Npora Admin`                       |
| `VITE_API_PREFIX`             | 同源 API 前缀，默认 `/api`                         |
| `VITE_API_URL`                | Vite 开发与本地预览代理的目标地址                  |
| `VITE_DEMO_ENABLED`           | 默认 false；true 时加载 `examples/`                |
| `VITE_TOKEN_STORAGE`          | `session`、`local`、`memory`，默认 session         |
| `VITE_AUTHENTICATOR_ENABLED`  | 验证器界面入口，默认 `false`，后端独立校验绑定状态 |
| `VITE_PASSWORD_RESET_CONTACT` | 忘记密码时展示的管理员联系方式，可留空             |
| `VITE_BUILD_COMPRESS`         | 默认 true，生成 gzip 产物                          |
| `VITE_BUILD_ANALYZE`          | 默认 false，启用后输出体积报告                     |

`dev:demo` 和 `build:demo` 通过 `scripts/demo.mjs` 在进程环境开启展示功能，不改写环境文件。开发默认使用维护者的测试 API，可通过启动进程的 `VITE_API_URL` 覆盖。普通 `npm run dev` 读取开发配置，设置 `VITE_DEMO_ENABLED=true` 可进入展示模式。

开发与本地预览只转发 API 前缀本身和它的子路径，转发时去掉该前缀并保留查询参数。生产静态文件的反向代理由站点服务器或网关配置。任何 `VITE_*` 值都不能用于保存密码或服务端密钥。语言与 Element Plus 文案放在 `src/config/i18n.ts` 和 `src/locales/`；默认时区放在 `src/config/datetime.ts`，时区枚举放在 `src/types/timezone.ts`，均不需要环境变量或数据库。日期显示与时间区间用法见 [多语言与时区](i18n.md)。

## 新增页面

1. 核心业务页放在 `src/views/`，演示页放在 `examples/pages/`。
2. 定义 DTO 和 API 函数；页面不直接发请求或判断后端实现。
3. 核心动态菜单的 `component` 相对于 `src/views/`，例如 `system/user/index`。演示模块保留 `examples/table/index` 等兼容标识，映射到独立示例目录。
4. 后端返回唯一的路由名称及该账号的实际权限；界面用 `v-permission` 或 `usePermission` 控制，接口权限由后端执行。
5. 按需设置 `keepAlive`、`fixedTab`、`hidden`、`activeMenu`、`routeQuery` 和 `order`。
6. 复杂行为增加适当回归。核心检查不要求演示后端可用，完整联调使用隔离测试数据库。

## 本地偏好与缓存

界面设置按字段校验，损坏或不可用的浏览器存储会降级，不保证跨刷新的持久化。个人资料与表单草稿按账号隔离。

从页面右上角的齿轮打开应用设置。八种主题色、组件尺寸、菜单布局、顶部页签样式、灰色模式、色弱辅助和水印等偏好保存在当前浏览器。顶部和混合布局将导航与账号操作放在一条顶栏，窄屏使用侧栏。恢复宽屏后继续使用已选的桌面布局。水印使用应用名称。

“清空缓存”经确认后刷新当前页面，重新加载页签、页面和字典等运行数据。偏好与已保存的草稿会保留，未保存的修改可能丢失。默认会话存储会保留登录，仅内存模式需重新登录。“恢复默认设置”用于重置本机界面偏好。

顶部的菜单搜索支持中英文名称和路由路径，可用方向键选择、回车打开、Esc 关闭。结果来自当前账号可见的菜单。

后台切页耗时较长时，页面顶部显示随主题色变化的进度条。列表筛选的输入框、下拉框、日期控件和按钮跟随同一档组件尺寸。

遇到 `504 (Outdated Optimize Dep)` 或依赖目录下的动态模块加载失败时，停止开发服务，执行 `npm run dev --force` 后强制刷新；这是依赖预构建问题，不应靠修改权限或页面路径解决。测试使用独立临时缓存，不覆盖开发服务的预构建目录。

## 公共列表逻辑

`src/composables/useManagementTable.ts` 管理带关键词、状态与分页的权限列表，统一查询取消、过期响应隔离、末页回退以及保存和删除互斥。角色页面只配置 API，用户页面保留账号字段过滤、超级管理员删除保护及角色/部门选项加载；字典页面通过 `useDictionaryTable.ts` 补充字典缓存失效回调。树形菜单、部门继续保留业务专属逻辑；用户筛选通过筛选工厂扩展。演示用的 `examples/composables/usePaginatedTable.ts` 支持本地数据、排序和自定义筛选，职责不同，不耦合系统权限。

## 新业务与编辑表单

新增业务页面参照 [完整教程](new-business-page.md)。管理表单共用 `useFormSubmit`：保存规范化快照，未变化编辑直接关闭；校验期间及请求期间防止重复提交；关闭、重新打开或卸载后，旧校验结果不再提交。用户角色集合排序、菜单查询对象按键比较，避免仅顺序变化就发送更新。关闭或取消不刷新列表，实际写入成功由列表逻辑刷新一次。
