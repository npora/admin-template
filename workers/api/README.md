# 可选后端示例

此目录是独立测试 API 的参考实现，涵盖认证、会话、动态菜单、按钮权限、首页汇总，以及用户、部门、角色、菜单、字典和授权管理。不导入前端源码，普通前端开发和构建不会启动或部署它。

推荐保留作为参考，不需要为了使用模板而删除。执行 `pnpm dev:demo` 即可体验；接入自己的后端时，配置 `VITE_API_URL` 和 `VITE_DEMO_ENABLED=false`，执行 `pnpm dev`，无需修改本目录。

## 目录职责

| 目录                | 用途                                         |
| ------------------- | -------------------------------------------- |
| `src/`              | HTTP 分发、统一错误与响应处理                |
| `src/config/`       | 允许引用的前端页面清单                       |
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
pnpm --dir workers/api test
pnpm --dir workers/api run build
```

这些检查不会部署远程服务。根目录的 `pnpm run check` 会检查仍然存在的可选后端；普通 `pnpm build` 只构建前端。

数据库认证和接口授权属于后端职责，前端权限指令仅控制界面。正式 SQL 与本目录的演示数据独立维护。删除本地目录不会删除远程服务。

接口契约见 [API 文档](../../docs/api.md)，接入方式见 [后端切换](../../docs/backend-replacement.md)，全项目目录说明见 [目录职责](../../docs/project-structure.md)。
