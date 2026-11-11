# 前端业务示例与个人中心

示例页面已移到根目录 `examples/`，仅展示模式加载。表格任务、表单与下载使用页面自身的数据，展示首页通过真实 API 获取统计。普通核心构建不导入这些页面。启动和目录说明见 [演示模块](../examples/README.md)。

## 入口

| 页面     | 地址与入口                                                | 访问范围                                         |
| -------- | --------------------------------------------------------- | ------------------------------------------------ |
| 通用表格 | `/system/operation/table`，系统管理 → 操作示例 → 表格示例 | 由现有动态路由授权；列表要求 `system:table:list` |
| 分步表单 | `/examples/form`，侧栏“表单示例”                          | 所有已登录账号                                   |
| 个人中心 | `/profile`，右上角用户菜单 → 个人中心                     | 所有已登录账号；账号、角色和权限只读             |
| 文件下载 | `/system/operation/download`，操作示例 → 下载示例         | 页面授权及 `system:download:download`            |

表格写操作权限为 `system:table:create`、`system:table:update`、`system:table:delete`；导出为 `system:table:export`。当前超级管理员拥有通配权限，可演示全部功能。普通账号需由菜单/按钮授权分配相应权限；页面和控制器都检查权限，隐藏按钮不代替操作校验。正式 SQL 不包含这些演示菜单，展示后端独立维护示例授权。

## 表格与可复用组件

- `src/composables/usePaginatedTable.ts`：筛选、查询快照、分页、排序、请求取消、竞态隔离、加载/失败状态和删除后的末页回退。`fetcher` 接收查询对象和 `AbortSignal`，返回 `{ list, total }`，可替换为真实接口。筛选字段使用扁平可复制对象。
- `src/components/TableToolbar`：标题、摘要、刷新、密度、列显隐和业务操作插槽。必选列不能隐藏。已有用户、角色列表也复用标题/刷新工具栏。
- `src/components/DataTable`：统一表格、加载状态、空数据提示和可选分页，首页、用户、角色、部门、菜单及表格示例均已接入。默认 `border=true`、`rowKey="id"`；业务列保留原生 `ElTableColumn` 插槽，不引入列配置 DSL。
- `src/components/TablePagination`：`DataTable` 内部复用的分页基础组件，分页默认居中，窄屏溢出时从起点横向滚动。
- `examples/utils/csv.ts`：UTF-8 CSV、引号/换行转义、字符串公式防护与浏览器下载，不依赖额外导出库。

分页列表示例（筛选、请求、翻页及末页回退仍由业务 composable 负责）：

```vue
<DataTable
  :data="rows"
  :loading="loading"
  pagination
  :page="query.page"
  :page-size="query.pageSize"
  :total="total"
  :pagination-disabled="busy"
  @update:page="changePage"
  @update:page-size="changePageSize"
>
  <ElTableColumn prop="username" label="用户名" />
  <template #empty><ElEmpty description="暂无匹配用户" /></template>
</DataTable>
```

首页或树形表格不传 `pagination`，便不会显示分页。`stripe`、`size`、`tree-props`、`default-expand-all`、`default-sort` 等原生属性，以及其他原生事件会传给内部 `ElTable`；`selection-change` 和 `sort-change` 提供泛型事件类型。支持默认列、`empty` 和 `append` 插槽，默认空状态使用 Element Plus 的当前语言；可通过 `empty-text` 修改默认提示。`class`、`style` 作用于外层容器，容器内的原生表格样式使用 `:deep(.el-table)`。

需要实例操作时，使用 `ref<DataTableInstance>()`（类型位于 `components/DataTable/types.ts`）。组件提供 `clearSelection()`、`doLayout()`；其他高级方法通过 `getTable()` 取得原生实例。组件不内置请求、筛选或权限逻辑，也不会自行重置页码，避免与页面现有的加载逻辑重复触发。

表格使用 32 条独立任务数据，支持新增、编辑、单条/批量删除、跨页保留勾选。重新查询或重置会清空选择，切换页码保留选择。导出有勾选时导出所选记录，否则导出全部筛选结果，且只包含可见业务列；选择框和操作列不导出。排序、筛选、预算和日期显示均支持当前语言。

点击“模拟加载失败”会让下一次本地加载失败，方便验证错误与重试。该操作不会修改数据。示例数据在当前组件生命周期内保存，重新打开页面后恢复；若给页面启用 KeepAlive，则随页面实例保留。

```ts
const table = usePaginatedTable<User, { keyword: string }>({
  filters: () => ({ keyword: '' }),
  fetcher: (query, signal) => getUserPage(query, signal)
})
```

## 分步表单

表单包含基础信息、计划设置、确认预览三步，演示文本、联动下拉框、日期区间、预算、优先级、多选成员、邮件通知开关、条件必填邮箱、附件与确认项。更换分类会清理不匹配的负责人；校验函数同时用于界面规则和提交检查。

草稿按用户 ID 与用户名隔离，保存在当前浏览器，只保存白名单字段；读取时检查版本、字段类型、枚举、日期和数值范围。允许保存未填写完整的草稿，完成提交时仍必须通过全部校验。重置会清除当前账号的草稿。

附件仅在页面内保留，不上传、不写入草稿，最多 3 个 PDF/PNG/JPG/TXT 文件，每个不超过 2 MB。离开页面前会提醒未保存内容；缓存页面停用时移除浏览器退出监听。退出登录或认证失效前往登录页不被表单确认拦住。完成提交只展示本地结果，不代表服务端已保存。

## 个人中心

个人中心展示真实会话中的账号与角色，允许保存本地显示名称、头像 URL、邮箱、手机号和简介。保存后顶栏、首页问候和个人资料卡同步使用本地显示值；`userInfo`、Token、角色及权限不会被修改。

本地资料按 `id:username` 保存，防止演示数据重置后同一 ID 被另一个用户名使用时串号。读取时过滤未知字段与无效资料，最多保留 20 个账号。头像仅接受不含账号密码的 HTTP(S) 地址。清除本地资料后恢复会话默认显示；退出登录后不再展示上一账号的资料。

偏好设置复用现有主题、语言、组件尺寸、面包屑和标签页设置，修改会应用并持久化。个人中心位于登录保护下的静态路由，通过用户菜单访问，不加入侧栏。

## 验证与视觉检查

`npm run check:examples` 检查查询竞态、表格 CRUD/排序/删除末页回退/只读权限/失败重试、CSV 转义与公式防护、表单和草稿校验、附件限制、资料账号隔离以及新页面登录守卫。多语言检查自动包含新页面词条。

浏览器验收应覆盖中文/英文、浅色/深色、桌面/移动端，以及切换缓存页面、日期清空、文件超限、取消删除、表单离开确认和实际文件下载。自动化回归与生产构建不能替代浏览器视觉验收。

`examples/components/PagePlaceholder/` 仅用于缓存演示的占位说明，和示例页面一起移除，不属于核心公共组件。
