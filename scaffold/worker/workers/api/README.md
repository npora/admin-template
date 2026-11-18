# 独立 Worker 后端

提供认证、会话、动态菜单、按钮权限和用户/部门/角色/菜单/字典管理，菜单数据只引用核心前端页面。源码不导入前端，普通 `npm run dev` 和 `npm run build` 不启动或部署后端。

- `src/`：HTTP 入口；`config/` 页面白名单与认证默认值，`modules/` 接口，`repositories/` SQL，`security/` 密码、Token 和授权。
- `migrations/`：SQLite 表结构和增量迁移，按文件名顺序执行，与根目录正式 MySQL SQL 分开使用。
- `scripts/`：后端构建、账号初始化与接口验证工具。
- `tests/`：真实 SQLite 与 HTTP 回归。
- `.local/`：本机私密资料，忽略提交；`dist/`：可重新生成的构建产物。

需要 Node.js 22.13+。根目录执行 `npm run check:backend` 验证后端，`npm --prefix workers/api run build` 构建 `workers/api/dist/worker.js`。

后端使用 `DB` 数据库绑定、`AUTH_PEPPER` 密钥和 `CORS_ORIGINS` 配置。迁移及账号初始化后，把可访问的 API 地址写入根目录 `.env.development.local` 的 `VITE_API_URL`，然后执行 `npm run dev`。不会自动连接展示站 API，不附送管理员密码，不自动创建远程资源。

保持登录、管理员密码重置及默认关闭的验证器接口见 [登录与账号安全](../../docs/authentication.md)。已有后端先增量应用 `0007_totp.sql`、`0008_millisecond_timestamps.sql`，新库按顺序执行全部迁移；验证器加密主密钥仅保存在后端配置。

首次执行 `npm --prefix workers/api run bootstrap` 会在后端 `.local/` 创建初始化 SQL 和随机账号资料；已有目录时拒绝覆盖。迁移后执行其中的 `bootstrap.sql`，密钥与账号资料仅在本机查看。不要把真实密钥和密码写入源码。

[接口契约](../../docs/api.md) · [权限模型](../../docs/rbac.md) · [正式 MySQL SQL](../../database/mysql/README.md)

管理员创建验证器直接启用，用户导入生成的密钥后即可使用动态码登录；个人中心自行绑定仍需动态码确认。两种流程复用已有验证器表与主键，已完成验证器迁移的库可增量应用 `0009_sort_indexes.sql` 补充查询索引。
