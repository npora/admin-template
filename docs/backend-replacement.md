# 接入后端

1. 按 [接口契约](api.md) 实现登录、用户信息、动态路由以及系统管理接口。
2. `.env.development` 中配置 `VITE_API_URL`，执行 `npm run dev`。
3. 生产服务器将 `/api` 转发到后端，执行 `npm run build` 发布 `dist/`。

前端请求集中在 `src/api/`，统一请求、响应、Token 和错误处理集中在 `src/api/client.ts` 与 `src/api/protocol/`。响应协议有差异时在这里适配。

[正式 MySQL SQL](../database/mysql/README.md) 包含核心权限表和基础授权，不包含测试账号。密码哈希、管理员初始化、接口鉴权由后端负责。
