# 接口契约

## 响应与错误

默认响应为 `{ code: 0, message: 'success', data }`，`code === 0` 表示业务成功。分页响应的 `data` 为 `{ list, total }`。公共类型位于 `src/api/types/common.ts`；其他后端协议可通过 `api/protocol` 适配。

项目使用 `@npora/request` 1.22.3 的 data-first API：`src/api/client.ts` 中的两个业务客户端会在 `onResponse` 中统一校验并解包响应。API 模块的泛型填写 `data` 的类型，调用方直接得到业务数据，不再读取 `.data` 或重复调用 `unwrapApiResponse`：

```ts
return request.get<PageResult<ManagedUser>>('/system/users', {
  query: { ...query },
  signal
})

return request.post<ManagedUser>('/system/users', { json: input })
```

需要状态码或响应头时使用 `request.getResponse<T>()`，其 `.data` 仍是解包后的业务数据，`.raw` 保留原始响应。默认客户端面向上述 JSON 协议；外部第三方接口、文件和流应另建客户端。类型泛型不会校验 DTO 内部字段；当前运行时只校验外层协议的 `code`、`message` 和 `data`。无效协议会抛出 `API_RESPONSE_INVALID`，不会重试。

HTTP 401，以及业务 code 为 `401`、`10002`（含字符串形式），表示登录失效，映射位于 `api/errors/handling.ts`。403 表示权限不足，保留当前会话。取消请求不通知，失败重试结束后才显示最终错误。

页面应 catch 异常以完成本地 loading 等状态清理；同一错误再次交给 `handleRequestError` 不会重复提示。请求配置 `context: { silentError: true }` 可关闭自动通知，但仍抛出异常，并保留过期清理与跳转。

## 认证与动态路由

| 接口                | 请求 / 返回                                     |
| ------------------- | ----------------------------------------------- |
| `POST /auth/logout` | Bearer Token → `null`，撤销该会话；重复退出幂等 |
| `POST /auth/login`  | `{ username, password }` → `{ accessToken }`    |
| `GET /auth/user`    | 用户资料、`roles` 和实际授予的 `permissions`    |
| `GET /auth/routes`  | 当前用户获准访问的 `DynamicRoute[]`             |

完整类型见 `src/api/types/auth.ts` 与 `src/api/types/route.ts`，Mock 内存模型和种子节点见 `mock/rbac/database.ts`。

路由 `component` 相对于 `src/views`，例如 `system/user/index`，只允许页面入口，不允许内部 `components`。目录可嵌套多层 `children` 或提供 `redirect`。所有路由名称和完整路径必须唯一，不能覆盖静态路由。

`hidden` 仅隐藏菜单与标签；是否可访问取决于后端是否返回路由。路由上的 `permissions` 用于描述可配置的按钮权限，不会自动授予用户；实际权限以 `/auth/user` 返回值为准。`*` 表示全部权限。

## 用户管理

入口为 `/system/user`，页面位于 `src/views/system/user`，接口封装位于 `src/api/modules/user.ts`。

| 接口                       | 用途             | 权限                 |
| -------------------------- | ---------------- | -------------------- |
| `GET /system/users`        | 查询、筛选和分页 | `system:user:list`   |
| `POST /system/users`       | 新增用户         | `system:user:create` |
| `PUT /system/users/:id`    | 修改用户         | `system:user:update` |
| `DELETE /system/users/:id` | 删除用户         | `system:user:delete` |

列表接收 `page`、`pageSize`、`keyword`、`roleId`、`departmentId`、`status`，状态统一为 `0 | 1`。关键词匹配用户名、姓名、邮箱和手机号。`departmentId` 筛选所选部门及其全部未删除下级部门。新增需要 `username`、`password`、资料字段和 `roleIds`；更新不允许修改用户名、密码或超级管理员标记。资料字段包括 `departmentId`、`displayName`、`avatar`、`email`、`mobile`、`status`。可空字段用 `null`，`roleIds` 可为空数组。

响应提供用户角色详情、部门名称、`isSuperAdmin`、最后登录时间和审计时间，不包含密码或哈希。创建时密码由 Mock 哈希存储；新建账号可登录。角色分配同时要求 `system:user:assign-roles`；只有资料编辑权限不能改变角色集合。超级管理员标记不依赖用户 ID 或角色编码，不能在此接口设置，禁止禁用或删除超级管理员。

## 角色与授权

| 接口                             | 用途                                    | 权限                 |
| -------------------------------- | --------------------------------------- | -------------------- |
| `GET /system/roles`              | 分页查询角色                            | `system:role:list`   |
| `POST /system/roles`             | 新增角色                                | `system:role:create` |
| `PUT /system/roles/:id`          | 修改角色                                | `system:role:update` |
| `DELETE /system/roles/:id`       | 软删除无用户关联的角色                  | `system:role:delete` |
| `GET /system/roles/menu-options` | 读取完整授权树                          | `system:role:grant`  |
| `GET /system/roles/:id/menus`    | 获取当前授权 ID                         | `system:role:grant`  |
| `PUT /system/roles/:id/menus`    | 以 `{ menuIds: number[] }` 整体替换授权 | `system:role:grant`  |

角色字段为 `code`、`name`、`description`、`sortOrder`、`status`。列表支持 `keyword`、数值 `status` 和分页。授权保存去重并补齐祖先；不会因为勾选目录而自动授予其全部后代。

## 菜单与选项

| 接口                              | 用途                 | 权限                               |
| --------------------------------- | -------------------- | ---------------------------------- |
| `GET /system/menus`               | 菜单/按钮树          | `system:menu:list`                 |
| `POST /system/menus`              | 新增节点             | `system:menu:create`               |
| `PUT /system/menus/:id`           | 修改节点             | `system:menu:update`               |
| `DELETE /system/menus/:id`        | 软删除叶节点         | `system:menu:delete`               |
| `GET /system/roles/options`       | 用户表单中的角色选项 | 用户查询、新增或编辑任一权限       |
| `GET /system/departments/options` | 用户表单中的部门树   | 用户或部门查询、新增、编辑任一权限 |

菜单请求类型见 `src/api/types/menu.ts`，包含 SQL 对应的路由、查询参数、显示、缓存、排序和状态字段。节点类型是 `1=目录`、`2=页面`、`3=按钮`。目录与页面只能挂在目录下，按钮必须挂在页面下；按钮的路由字段为 `null`。接口拒绝循环父级、重定向循环、冲突路径/名称/权限码，以及不存在的组件和授权目标。

写操作不自动重试；删除使用软删除。由于 SQL 唯一索引不含 `deleted_at`，用户名、邮箱、手机号、角色编码、菜单路由名称和权限码在软删除后仍保留唯一性约束。完整字段映射和权限生效规则见 [RBAC 说明](rbac.md)。

## 部门管理

| 接口                             | 用途                       | 权限                       |
| -------------------------------- | -------------------------- | -------------------------- |
| `GET /system/departments`        | 完整部门树及直接关联用户数 | `system:department:list`   |
| `POST /system/departments`       | 新增部门                   | `system:department:create` |
| `PUT /system/departments/:id`    | 编辑部门                   | `system:department:update` |
| `DELETE /system/departments/:id` | 软删除无子部门和用户的部门 | `system:department:delete` |

字段为 `parentId`、`name`、`code`、`leader`、`phone`、`email`、`sortOrder`、`status`，可空字段传 `null`。父级不得为自身或后代；部门编码在软删除后仍保留唯一性。筛选在完整树上进行并保留匹配节点的祖先。部门禁用不级联改变用户状态；新分配用户时不能选择禁用部门，编辑已有用户允许保留原部门。

## 工作台概览

`GET /system/dashboard` 要求登录，返回当前账号、可访问页面数及 `capabilities`。仅具有对应查询权限时返回 `users`、`roles`、`departments` 汇总；用户汇总包含最近五位用户、启用/禁用人数和部门分布，不提供密码字段。统计来自当前 Mock 关系数据，排除软删除记录。返回类型见 `src/api/types/dashboard.ts`。

首页通过 `useDashboard` 加载数据，支持取消旧请求、刷新失败保留最近成功结果以及重试。页面、快捷入口和统计卡片均随当前权限展示，没有查询权限的汇总不会由 Mock 接口返回。

## 可选后端示例

`workers/api/` 提供认证、会话、权限、首页和管理接口的参考实现，不参与普通前端构建。模板默认使用 Mock；接入任何符合接口契约的 HTTP 后端时，只需配置地址并执行 `pnpm dev:api`。具体目录用途见 [项目目录说明](project-structure.md)。
