# 可选的 Cloudflare 测试 API

独立的 Worker + D1 测试服务，不导入前端或 Mock。整个 `workers/` 目录可删除，也可复制到单独的仓库；前端始终通过 HTTP 契约访问服务。

删除本地目录不会删除远程 Worker、D1 或展示站的 `API` 服务绑定。改用自有后端时需同步调整开发代理及生产转发；`.local/` 中的凭据和 pepper 也不是可随意重建的缓存。完整的目录职责和裁剪边界见 [项目目录与裁剪说明](../../docs/project-structure.md)。

已实现健康检查、认证与会话、动态菜单和按钮权限、首页汇总，以及用户、部门、角色、菜单 CRUD 和角色授权。前端可切换到此服务；共享模板仍默认使用 Mock，本机连接通过不提交的 `.env.development.local` 配置。

```text
workers/api/
  src/
    index.mjs           HTTP 分发、CORS 与统一错误边界
    http.mjs            有界 JSON、响应和 HTTP 错误
    modules/            认证、首页、管理接口、校验与 DTO 映射
    config/pages.mjs    服务端允许引用的前端页面入口目录
    repositories/       D1 参数化查询与事务批处理
    security/           密码、登录限流、授权与路由 DTO
  migrations/           独立的 SQLite 建表及角色菜单种子
  scripts/              随机凭据初始化、单文件打包
  tests/                真实 SQLite + D1 方法替身测试
  integration/          仅在完整仓库运行的前端客户端联调
  .local/               本机凭据和一次性账号 SQL，忽略提交
  dist/worker.js        可直接粘贴至控制台的打包产物，忽略提交
  package.json          独立工具入口
```

## 本地检查和准备

Node.js 22.13+（使用 `node:sqlite` 测试），运行时源码只用 Web API，无第三方运行时依赖。构建工具 Vite 是此目录自己的开发依赖，不会让前端依赖 Worker。

```sh
# 在仓库根目录使用现有工具
pnpm --dir workers/api test
pnpm --dir workers/api run build
pnpm --dir workers/api run bootstrap
```

独立复制本目录后，先在本目录 `npm install`，再运行 `npm test`、`npm run build` 和 `npm run bootstrap`。

`bootstrap` 生成 `.local/bootstrap.sql` 与 `.local/credentials.json`。后者包含两个独立随机账号密码和 `AUTH_PEPPER`，文件权限为 `0600`，目录权限为 `0700`。不会在终端打印秘密，目录已存在时拒绝覆盖。不要删除它重新生成来“重置密码”，否则新的 pepper 与已存哈希不匹配。

## 首次部署（空测试数据库）

1. 在 D1 控制台依次执行 `migrations/0001_schema.sql`、`migrations/0002_seed.sql`、`migrations/0003_auth_revocation.sql`、`migrations/0004_management_guards.sql` 和 `.local/bootstrap.sql`，每份只执行一次。脚本没有 DROP、REPLACE 或公开默认密码，不应重新应用于已有业务数据库。
2. Worker 保留 D1 绑定 `DB`。在“设置 → 变量和机密”新增 **Secret** `AUTH_PEPPER`，值取本机 `.local/credentials.json` 中的同名字段。
3. 若需要浏览器跨域直连，添加普通变量 `CORS_ORIGINS`，值为逗号分隔的准确来源，如 `http://localhost:3000,https://admin.example.com`，不要带路径或尾部斜杠；不支持通配符。经过 Vite 同源代理时不需要放行浏览器来源。
4. 打开“编辑代码”，用 `dist/worker.js` 的完整内容替换入口并部署。不要仅粘贴 `src/index.mjs`，它含本地模块导入。兼容日期使用 `2026-11-10`，开启 Logs 和 Traces。
5. 检查 `/health`，再使用生成的密码调用认证接口。响应统一为 `{ code: 0, message: 'success', data }`。

上述步骤也可通过 Cloudflare API 执行；初始化前必须确认目标 Worker 绑定及数据库是否为空，保存原脚本备份。此目录不硬编码账户、数据库 ID 或个人域名。

## 增量部署到已有测试库

已执行前三份迁移的数据库仅执行 `migrations/0004_management_guards.sql`，不要重新初始化业务表、种子或密码。然后重新打包并部署 `dist/worker.js`，保留 `DB`、`AUTH_PEPPER` 和现有来源配置。

0004 增加业务数据版本和事务门禁：服务端在一致快照中校验权限与关联，再通过 `D1.batch()` 原子提交；中途发生数据或权限变化返回 409，已撤销的会话返回 401。用户与角色关联、角色与菜单授权均整组成功或整组回滚。前端收到冲突后应刷新再重试。

## 已实现的接口

每个路径也接受 `/api` 前缀，方便开发代理和独立域名接入。

| 接口                | 请求与返回                                            |
| ------------------- | ----------------------------------------------------- |
| `GET /health`       | D1 连通性，不代表已完成建表                           |
| `POST /auth/login`  | JSON `{ username, password }` → `{ accessToken }`     |
| `POST /auth/logout` | Bearer Token；撤销指定会话，重复退出成功，返回 `null` |
| `GET /auth/user`    | Bearer Token；用户资料、角色和实际按钮权限            |
| `GET /auth/routes`  | Bearer Token；获准页面的路由树和按钮描述              |

登录失败为 HTTP 401、业务码 `10001`；会话失效为 HTTP 401、业务码 `10002`；超限返回 429 和 `Retry-After`。前端退出会立即清除本地状态，并尽力撤销对应的旧 Token；网络失败不阻止退出，远端会话最长一小时后失效，不会影响后来登录的新会话。

## 认证与授权约定

- 密码：随机 16 字节盐，先以 Worker Secret 做 HMAC-SHA256，再做 100000 次 PBKDF2-SHA256。哈希格式带版本，验证不直接比较秘密字符串。该次数适配 Workers 的 PBKDF2 限制；这是测试服务方案，正式认证方案应结合部署 CPU 配额与密码策略评估。Mock 哈希不兼容，不能复制。
- Token：随机 32 字节，只在登录成功时返回明文；D1 仅存 SHA256 摘要、用户关联、凭据指纹及过期时间，TTL 一小时，每账号最多十个会话。改密码使旧会话失效，禁用/软删除用户立即拒绝访问；数据库触发器同时删除关联会话，重新启用后也不能恢复旧 Token。
- 登录预算：15 分钟内同 IP 与账号组合最多五次，同 IP 总共三十次，成功和失败都计数；计数保存在 D1，不能通过切换 Worker 实例绕过。只信任 `CF-Connecting-IP`，没有该头时共享 `unknown` 桶。
- 请求：登录 JSON 最大 8 KiB（同时检查实际流长度），字段、方法和内容类型校验；错误响应不暴露 SQL、密码、Token 或 Secret。
- 授权：有效角色取并集；仅有效按钮产生权限；禁用/删除的祖先使整个子树失效。只补全祖先，不自动授权子孙；隐藏不撤销访问；只有 `is_super_admin=1` 返回 `*`。每次访问从 D1 重新计算，角色名称 `admin` 不赋予超级管理员能力。
- 后续 CRUD 必须先调用 `authenticate()`，再用 `authorization()` + `requirePermission()` 校验接口对应权限；不能只信任前端按钮隐藏。

实现依据：[D1 Batch 与 Prepared Statements](https://developers.cloudflare.com/d1/worker-api/)、[Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)、[Workers PBKDF2 限制讨论](https://github.com/cloudflare/workerd/issues/1346)。

## 管理接口

完整路径、字段与权限详见仓库 `docs/api.md`：

- `/system/dashboard`：按当前用户查询权限返回 SQL 汇总、最近用户及部门分布。
- `/system/users` 与 `/:id`：SQL 查询分页、筛选、创建、修改、软删除；角色分配还要求 `system:user:assign-roles`，不允许通过资料接口修改用户名、密码或超级管理员标记。
- `/system/roles` 与 `/:id`：角色 CRUD；`/options` 为用户表单选项；`/menu-options`、`/:id/menus` 为授权查询与保存，自动补齐祖先，不向下扩权。
- `/system/departments` 与 `/:id`：部门树与 CRUD；`/options` 为用户表单树；保护有子部门或有效用户的部门。
- `/system/menus` 与 `/:id`：目录、页面、按钮 CRUD；拒绝父级环、路由冲突、重定向环和未登记组件。新增前端页面后同时维护 `src/config/pages.mjs`，无需导入前端代码。

列表 `pageSize` 最大 100；角色、菜单、部门为配置目录，一次读取；用户表通过 SQL 限制分页与最近记录数量，不将全部用户或密码哈希装进响应。POST/PUT 只接受声明字段，JSON 体上限仍为 8 KiB，新增用户密码为 12–128 个字符。GET/POST/PUT/DELETE 全部校验服务端权限，CORS 预检列出这些方法。

软删除保留原唯一值和历史关系；超级管理员不能禁用或删除。角色存在有效用户关联时不能删除，菜单有有效子节点时不能删除。数据库账户的直接 SQL 操作不等于接口校验，不应绕过服务写入不合法层级。

## 测试边界与前端接入

测试执行本目录实际迁移、SQLite 外键和唯一性约束，再通过 D1 方法替身验证认证、撤销、过期、权限变化、CORS、限流和请求边界。它不等价于 workerd 集成测试；部署后仍需检查真实 D1、Secret 和加密运行时。

前端可在根目录 `.env.development.local` 中设置 `VITE_API_MOCK=false` 和 `VITE_API_URL=你的Worker地址`，重启 Vite。共享 `.env.development` 保持 Mock 默认值；本机配置优先且不提交。生产仍需要把 `/api` 代理到 Worker。

根目录 `pnpm test` 还会运行 `integration/frontend.test.mjs`，用真正的前端请求客户端、会话和路由转换调用 Worker 与 SQLite，不依赖线上服务；复制本目录单独运行 `npm test` 时不会要求前端文件。可用如下命令做线上冒烟检查（会用本机生成的账号登录并退出，不打印密码或 Token）：

```sh
pnpm --dir workers/api run smoke -- https://你的测试Worker域名
# 启动本地前端后，验证实际 /api 代理；只有回环地址允许 HTTP。
pnpm --dir workers/api run smoke -- http://localhost:3000/api
```

管理模块线上联调会创建唯一命名的临时部门、角色、页面、按钮和用户，验证后软删除，并撤销测试会话。应只对测试服务运行：

```sh
pnpm --dir workers/api run smoke:management -- https://你的测试Worker域名
```

结果和未完成的清理 ID 记录在 `.local/management-smoke.json`；失败时不要忽略 `remaining` 列表。

本机 `.local/deployment.json` 记录本次部署目标和已应用迁移；账号密码与 Secret 位于 `.local/credentials.json`，部署前原脚本保存在 `.local/remote-before-deploy.json`。

前端替换方式见 `docs/backend-replacement.md`，所有接口 DTO 见 `docs/api.md`。
