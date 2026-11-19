# 可选后端示例

此目录是独立测试 API 的参考实现，涵盖认证、会话、动态菜单、按钮权限、首页汇总，以及用户、部门、角色、菜单、字典和授权管理。不导入前端源码，普通前端开发和构建不会启动或部署它。

推荐保留作为参考，不需要为了使用模板而删除。执行 `npm run dev:demo` 即可体验；接入自己的后端时，配置 `VITE_API_URL` 和 `VITE_DEMO_ENABLED=false`，执行 `npm run dev`，无需修改本目录。

## 目录职责

| 目录                | 用途                                         |
| ------------------- | -------------------------------------------- |
| `src/`              | HTTP 分发、统一错误与响应处理                |
| `src/config/`       | 前端页面白名单、认证默认配置                 |
| `src/modules/`      | 接口处理、输入校验和 DTO 映射                |
| `src/repositories/` | 数据库查询与事务处理                         |
| `src/security/`     | 密码、会话、授权与限流                       |
| `migrations/`       | SQLite 结构、种子与增量迁移                  |
| `scripts/`          | 本机初始化和构建工具                         |
| `tests/`            | 后端与 SQLite 回归；`helpers/` 提供测试辅助  |
| `integration/`      | 完整仓库中的前端请求与后端联调               |
| `.local/`           | 本机测试资料，忽略提交；不是可随意重建的缓存 |
| `dist/`             | 可重新生成的后端打包产物，不提交 Git         |

## 本地维护检查

需要 Node.js 22.13+，测试使用 `node:sqlite`。在完整仓库中运行：

```sh
npm --prefix workers/api test
npm --prefix workers/api run build
```

这些检查不会部署远程服务。根目录的 `npm run check:backend` 检查可选后端，`npm run check:all` 包含完整仓库回归；普通 `npm run build` 只构建前端。

数据库认证和接口授权属于后端职责，前端权限指令仅控制界面。正式 SQL 与本目录的演示数据独立维护。删除本地目录不会删除远程服务。

保持登录、管理员密码重置及默认关闭的验证器接口见 [登录与账号安全](../../docs/authentication.md)。升级时先增量应用 `0007_totp.sql`、`0008_millisecond_timestamps.sql`，不重跑旧迁移；验证器加密主密钥仅配置在后端。

已应用 `0008_millisecond_timestamps.sql` 的库可继续增量应用 `0009_sort_indexes.sql`，添加全量排序与会话保留查询的索引。再应用 `0010_recent_users_index.sql`，支持按创建时间查询最近用户。

应用 `0011_audit_logs.sql` 后，Worker 会记录管理员重置密码、启停验证器和角色授权结果。审计查询使用独立权限 `system:audit-log:list`，普通角色须显式授权。见 [审计接口契约](../../docs/api.md#操作审计日志)。

接口契约见 [API 文档](../../docs/api.md)，接入方式见 [后端切换](../../docs/backend-replacement.md)，全项目目录说明见 [目录职责](../../docs/project-structure.md)。

管理员创建验证器直接启用并在同一事务内撤销目标会话；个人绑定保留动态码确认。两种流程复用 `0007_totp.sql` 和 `0008_millisecond_timestamps.sql` 中的 `sys_user_totp`，无需新增字段或重跑已完成迁移。按用户查询由 `user_id` 主键支持。
