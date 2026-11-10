# 删除演示后端，接入自己的服务

前端的接口契约保留在 `src/api/types/` 与 `src/api/modules/`，请求配置位于 `src/api/client.ts`。业务页面不判断当前使用 Mock、Worker 还是自有服务。

```text
前端页面 → API 模块 → 请求客户端 → 自有后端
                              └ 开发可选 Mock 适配器

mock/          可删除的内存接口和相关测试
workers/api/   可删除的独立 Cloudflare 服务示例及其测试
```

Worker 与 Mock 不互相依赖。前端没有到这两个目录的直接文件导入，根项目也没有它们的运行时依赖或强制构建步骤。`build/optional-mock.ts` 和前端中的虚拟模块声明是可选适配器的边界，保留即可，无需跟着删除。

## 切换步骤

1. 删除 `mock/` 与 `workers/` 中不需要的演示代码，可以一起删除，也可以只保留其中一个。
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
