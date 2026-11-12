# 新增一个业务页面

以新增“业务记录”列表为例。以下代码是开发片段，不会自动创建接口、数据库或菜单；先在自己的后端准备接口，再接入前端。纯净版、Worker 版和展示版使用同一套核心开发流程。

## 1. 建立目录和 DTO

```text
src/
  api/types/record.ts
  api/modules/record.ts
  views/business/record/
    index.vue
    useRecordManagement.ts
    components/RecordForm.vue
```

页面入口使用 `index.vue`；局部弹窗和逻辑留在页面目录，存在跨页面复用后再提取公共组件。不要将业务页放进 `examples/`。

在 `src/api/types/record.ts` 中声明后端真实返回的 DTO：

```ts
import type { PageParams } from './common'

export interface RecordInput {
  name: string
  status: 0 | 1
}
export interface ManagedRecord extends RecordInput {
  id: number
}
export interface RecordQuery extends PageParams {
  keyword?: string
  status?: 0 | 1
}
```

实际字段、空值和权限以自己的后端契约为准，不把后端业务数据伪装成前端 Mock。

## 2. 添加 API 模块

`src/api/modules/record.ts`：

```ts
import { request } from '../client'
import type { PageResult } from '../types/common'
import type { ManagedRecord, RecordInput, RecordQuery } from '../types/record'

export function getRecords(query: RecordQuery, signal?: AbortSignal) {
  return request.get<PageResult<ManagedRecord>>('/business/records', {
    query: { ...query },
    signal
  })
}
export function createRecord(input: RecordInput) {
  return request.post<ManagedRecord>('/business/records', {
    json: input,
    extensions: { retry: 0 }
  })
}
export function updateRecord(id: number, input: RecordInput) {
  return request.put<ManagedRecord>(`/business/records/${id}`, {
    json: input,
    extensions: { retry: 0 }
  })
}
export function deleteRecord(id: number) {
  return request.delete<null>(`/business/records/${id}`, { extensions: { retry: 0 } })
}
```

不要手动再解包 `data`；当前协议层已经统一解包。页面通过 API 模块访问后端，后端必须独立验证登录和操作权限。

## 3. 组合列表和表单

当前管理权限码沿用 `system:资源:操作`，示例使用 `system:record:list/create/update/delete`。在 `useRecordManagement.ts` 组合：

```ts
import { useManagementTable } from '@/composables/useManagementTable'
import { getRecords, createRecord, updateRecord, deleteRecord } from '@/api/modules/record'

export function useRecordManagement() {
  return useManagementTable({
    permission: 'record',
    list: getRecords,
    create: createRecord,
    update: updateRecord,
    remove: deleteRecord
  })
}
```

在 `index.vue` 中调用该组合式函数，并在 `onMounted` 中调用 `load()`。筛选表单绑定 `filters`，查询使用 `search()`，重置使用 `reset()`。将 `rows`、`loading`、`query.page`、`query.pageSize`、`total` 连接到公共 `DataTable`；分页事件对接 `changePage`、`changePageSize`。具体属性和插槽参照现有 `src/views/system/role/index.vue`，不要另外复制一套分页实现。

新增按钮使用 `v-permission="'system:record:create'"`，编辑和删除分别使用 `update`、`delete` 权限。前端权限仅控制显示，接口仍由后端授权。

表单参照 `RoleFormDialog.vue`：

- 打开时只复制可编辑字段，对字段做与提交一致的规范化，调用 `useFormSubmit().reset(input)` 保存初始快照。
- 通过 `active`、`editing`、`saving`、`validate`、`close`、`submit` 回调接入公共提交逻辑。
- 对集合语义的数组排序后再比较；不要比较列表计数、审计字段或整个后端对象。
- 表单只发出 `submit`；父页面调用列表的 `save()`，成功后关闭。关闭或取消不额外调用 `load()`。
- 保存失败保留表单；校验失败不发送请求；编辑无变化时关闭且不发送更新请求。

## 4. 注册菜单与页面白名单

动态页面解析器会发现 `src/views/**/index.vue` 中允许的入口。创建页面后在菜单管理中添加页面节点，例如：

| 字段         | 示例                    |
| ------------ | ----------------------- |
| 路由名称     | `BusinessRecord`        |
| 父级目录路径 | `/business`             |
| 页面路径     | `record`                |
| 组件标识     | `business/record/index` |

父目录与页面组合后的访问地址为 `/business/record`；组件标识不包含 `src/views/` 和 `.vue`。名称与路径须唯一，按钮节点放在页面节点下，然后为角色授权。普通账号不会因为页面文件存在就自动获得访问权限。

使用自己的后端时，在该后端的页面白名单和接口授权中同步新增。使用独立参考后端时，更新 `workers/api/src/config/pages.mjs`；维护完整模板仓库时，同时更新 `scaffold/worker/workers/api/src/config/pages.mjs`。不要让后端直接导入前端源码。

数据库增量变更使用新的编号迁移。菜单 ID 由数据库生成，建立父子和授权关系时使用实际生成的 ID，不固定占用 60、100 等编号，也不重跑旧初始化文件。

## 5. 接入字典与中英文

若状态只表示固定的启用/停用，继续复用程序枚举。若“记录类型”由业务人员配置，在字典管理创建如 `biz_record_type` 的类型，然后使用 `useDict('biz_record_type')` 获取选项，用 `DictTag` 展示标签。值统一使用字符串，组件用法参照 [字典说明](dictionaries.md)。

页面标题、按钮、校验文案同步加入 `src/locales/zh-CN/` 与 `src/locales/en-US/`，按当前语言聚合入口注册。动态菜单的路由标题映射参照已有路由词条；后端维护的记录名称、字典标签保留原文。日期使用 `@/locales` 导出的 `formatDate(value)` 或 `formatDate(value, 'date')`。

## 6. 自检和实际验收

```sh
npm run check
npm run build
```

在完整模板维护仓库中额外执行 `npm run check:all`；涉及模板覆盖层时执行 `npm run check:presets`。生成项目没有的维护命令不需要补装，以其 `package.json` 为准。其他包管理器执行同名脚本即可。

至少验证：有权限的账号能打开和操作，无权限账号不能越权；查询和分页一致；取消、关闭、无变化保存不写入或刷新；实际保存只刷新一次；请求失败可重试；快速查询和退出登录后旧响应不能恢复页面数据；中英文、深色模式和窄屏均可用。
