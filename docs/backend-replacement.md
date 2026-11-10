# 后端切换与可选裁剪

推荐保留 `mock/` 和 `workers/`，通过配置选择数据源。使用模板、连接 Worker 或接入自己的后端都不需要删除文件。

## 不删除文件的使用方式

| 场景                | 启动方式        | 需要准备的内容                                       |
| ------------------- | --------------- | ---------------------------------------------------- |
| 无后端开发或体验    | `pnpm dev:mock` | 安装前端依赖即可，默认账号 `admin / 123456`          |
| 已有自己的后端      | `pnpm dev:api`  | 配置 `VITE_API_URL`，后端提供认证和业务接口          |
| 使用已部署的 Worker | `pnpm dev:api`  | 将 `VITE_API_URL` 设为 Worker 地址，使用该服务的账号 |
| 沿用项目环境配置    | `pnpm dev`      | 由 `VITE_API_MOCK` 决定使用 Mock 或 HTTP             |

连接真实后端时，在 `.env.development.local` 中配置：

```dotenv
VITE_API_MOCK=false
VITE_API_URL=http://localhost:8080
```

执行 `pnpm dev:api`。Worker 也使用同一配置，只需替换服务地址。`dev:mock` / `dev:api` 通过启动进程的环境变量覆盖 Mock 开关，不改写任何环境文件；其他配置仍由 Vite 加载。命令也支持 Vite 参数，例如 `pnpm dev:mock --host 127.0.0.1`。

`mock/` 是仅在开发启用的适配器；`workers/api/` 是供有需要的人独立部署的参考后端。普通 `dev`、`build` 不启动、部署或访问本地 Worker 源码；真实 HTTP 模式不加载 Mock 实现。使用者可一直保留这两个目录。

生产部署仍需要真实后端或测试 Worker；`pnpm build` 与 `pnpm preview` 不启用 Mock。根目录 `pnpm run check` 是模板维护者的全量检查，会检查仍然存在的可选模块；这不代表前端运行依赖这些模块。

以下内容仅适用于希望缩小源码包的使用者。

所有目录的职责和演示页面裁剪步骤见 [项目目录与裁剪说明](project-structure.md)。本篇主要说明替换 API 后端。

前端的接口契约保留在 `src/api/types/` 与 `src/api/modules/`，请求配置位于 `src/api/client.ts`。业务页面不判断当前使用 Mock、Worker 还是自有服务。

```text
前端页面 → API 模块 → 请求客户端 → 自有后端
                              └ 开发可选 Mock 适配器

mock/          可删除的内存接口和相关测试
workers/api/   可选的独立服务示例及其测试
```

Worker 与 Mock 不互相依赖。前端没有到这两个目录的直接文件导入，根项目也没有它们的运行时依赖或强制构建步骤。`build/optional-mock.ts` 和前端中的虚拟模块声明是可选适配器的边界，保留即可，无需跟着删除。

可以移除的是 `mock/` 与 `workers/` 中的演示实现，不是 `src/api/`。前端的 API 模块、类型、Token 管理与协议适配仍需保留或按自有后端调整。删除本地后端示例不会删除远程服务，生产环境需配置实际可用的 API 转发。

`@npora/request` 是请求客户端，不代替接口服务。已经连接 Worker 或自有后端时，设置 `VITE_API_MOCK=false` 即可停用 Mock；生产构建始终停用。保留 `mock/` 是为了让模板下载后可以离线演示和运行相关测试，不是请求库的必需依赖。

## 可选：移除演示后端

1. 确认真实后端可以使用后，再按需删除 `mock/` 与 `workers/` 中的演示代码；这不是接入后端的必要步骤。
2. 修改 `.env.development`；若存在 `.env.development.local`，优先修改该本机覆盖文件：

   ```dotenv
   VITE_API_MOCK=false
   VITE_API_URL=http://localhost:8080
   ```

   换成自己的接口服务地址，重启 Vite。开发请求默认以 `/api` 开头，Vite 转发时去掉该前缀。例如 `/api/auth/login` 转发为 `http://localhost:8080/auth/login`。

3. 后端按 [接口文档](api.md) 返回数据。默认业务响应是 `{ code: 0, message: 'success', data }`，认证使用 Bearer Token。如果已有后端契约不同，在 `src/api/modules/` 和 `src/api/protocol/` 做映射。
4. 运行 `pnpm run check` 与 `pnpm build`。根测试脚本只收集仍然存在的可选目录；核心前端测试留在 `tests/integration/`，Mock 和 Worker 的测试随各自目录删除。

即使 `.env.development` 仍保留 `VITE_API_MOCK=true`，只要 `mock/index.ts` 不存在，启动时也会回退到真实请求，不会报模块找不到。目录存在性的判断在 Vite 启动时执行，删除或恢复目录后需要重启开发服务。

## 生产部署

生产构建始终禁用 Mock；`VITE_API_URL` 只用于开发代理。生产环境由网站服务器将 `VITE_API_PREFIX`（默认 `/api`）转发至后端，页面路由回退至 `index.html`。请让后端根据业务需要处理前缀、认证和跨域。

如果准备直连跨域接口，需要按自己的部署方案调整请求地址及服务端 CORS；不要把数据库凭据或服务密钥放进 `VITE_*`，这类变量会进入浏览器产物。

## 验证目录可删除

```sh
pnpm run check:standalone
```

此命令在临时目录复制前端源码、配置与核心测试，明确不复制 `mock/` 和 `workers/`，依次执行类型检查、核心测试和生产构建。不会删除工作区中的演示文件，也不会连接远程后端。

保留 Mock 时的登录和 CRUD 测试用于验证前端演示；自有后端的认证、数据持久化和授权仍需由该后端项目负责测试。Worker 当前能力及独立运行说明见 [Worker 目录](../workers/api/README.md)（删除后此可选说明自然不再适用）。

本机连接 Worker 可参考根目录 `.env.development.local.example`；真实账号密码位于 `workers/api/.local/credentials.json`，不会进入前端环境变量或浏览器产物。Mock 测试显式启用内存适配器，不受个人接口地址影响。
