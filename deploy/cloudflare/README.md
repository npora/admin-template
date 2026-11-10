# Cloudflare 前端展示站

此目录只负责托管前端和转发 API，不含测试 API 的业务实现、数据库迁移或密码。删除 `mock/`、`workers/` 不影响前端构建；若改用自己的后端，也需要把部署目标切换为自己的服务。

## 在 Workers 和 Pages 页面连接 GitHub

选择仓库 `npora/admin-template`，使用下面的设置：

| 项目              | 值                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| 项目名称          | `admin-dome`，与 `cloudflare.config.ts` 的默认名称一致                                                   |
| 构建命令          | `pnpm run build:cloudflare`                                                                              |
| 部署命令          | `pnpm run deploy:cloudflare`                                                                             |
| 预览构建          | 首次配置关闭；本方案尚未配置分支预览构建                                                                 |
| Cloudflare Access | 公开展示站保持关闭                                                                                       |
| 高级设置 → 路径   | `/`                                                                                                      |
| API 令牌          | 使用 Cloudflare 的默认构建令牌创建流程；需要 Worker 部署权限及使用现有服务绑定的权限，不把令牌提交到仓库 |
| 可选构建环境变量  | `NODE_VERSION=22.18.0`                                                                                   |

Cloudflare CLI 要求 Node.js 22.18 或更新版本，使用 Node.js 24 也可以。项目使用 packageManager 中固定的 pnpm 版本；`cf` 和 Cloudflare Vite 插件的 beta 版本已在依赖中固定，升级后应重新验证构建。

**先提交并推送本次配置，再点击部署。** 提交 `cloudflare.config.ts`、本目录、修改后的 package.json、锁文件、pnpm-workspace.yaml、Vite 配置与其他相关修改。`dist/`、`.cloudflare/`、`.wrangler/` 和本机 `.local` 文件不提交。

不用配置静态输出目录：Cloudflare 专用构建将前端文件与 Worker 写入 `.cloudflare/output/v0/`，部署命令直接使用该产物。普通 `pnpm build` 仍只生成 `dist/`，适合其他静态服务器，不能代替这里的展示站构建命令。

## 页面与 API 请求

```text
浏览器 → 展示站 Worker
          ├ 页面与静态文件 → 构建后的前端资源
          └ /api/* → API 服务绑定 → npora-admin-api-test
```

静态资源配置为 SPA 页面回退，刷新 `/system/user` 等页面时可以恢复前端路由。`/api` 和 `/api/*` 优先交给代理，去掉该前缀后请求 API Worker；请求方法、请求体、查询参数、Bearer Token 和后端状态保留。API 响应不缓存，服务不可用时返回 JSON 502，不返回前端 HTML。

转发不会把浏览器 Cookie、Origin 或 Referer 发给测试 API。服务绑定指定固定目标，浏览器不能传入任意上游地址。展示站本身不需要 D1 或 `AUTH_PEPPER`，这些仍由现有 API Worker 管理；无需再创建或初始化数据库。

## 调整名称与 API 服务

默认名称与用户当前创建的 `admin-dome` 保持一致。若在面板改成 `admin-demo`，构建环境中添加 `CLOUDFLARE_WORKER_NAME=admin-demo`，或修改根配置默认值，确保配置和面板名称相同。

`CLOUDFLARE_API_WORKER` 可覆盖默认 API Worker 名称 `npora-admin-api-test`，目标必须存在于同一账户。它是服务名称，不是 URL，不含密码或令牌。`VITE_API_PREFIX` 可调整前缀；前端和部署配置从同一环境值读取。

上述值在构建时写入部署产物，修改后需要重新构建部署。`.env.development.local` 只用于本机开发，不会自动上传或用于本次生产构建。展示站使用现有 API 账号，Mock 默认账号表不代表 Worker 的初始化凭据。

服务绑定与普通 HTTPS 代理不同；如果自己的后端不在 Cloudflare Workers，改造此目录的代理和绑定即可，前端页面无需修改。

## 本地检查

```sh
pnpm run build:cloudflare
pnpm run check:cloudflare
```

第二条命令执行 `cf deploy --prebuilt --dry-run`，只检查已有产物，不上传、不创建或修改云端资源。本地检查成功不等于已经上线。浏览器最终验收应包含登录、刷新深层页面、接口 401/403/404 处理与退出。

构建可能启动临时本地 Workers 类型生成服务。生成的 `.cloudflare/types` 与输出目录均忽略，不作为前端源码或数据库内容提交。

依据：[Cloudflare CLI 构建与预构建部署](https://developers.cloudflare.com/cf/projects/)、[项目配置](https://developers.cloudflare.com/cf/projects/cloudflare-config/)、[Workers SPA 路由](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)。
