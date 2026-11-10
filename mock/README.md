# 可选的开发 Mock

整个目录可以直接删除，前端会改走真实 HTTP 请求；不需要修改业务页面、路由或请求客户端。建议同时把 `.env.development` 的 `VITE_API_MOCK` 设置为 `false`，再配置 `VITE_API_URL`。

```text
mock/
  index.ts       Mock 适配器入口
  identity.ts    内存会话与用户身份
  modules/       各业务接口处理
  rbac/          SQL 风格的内存表、DTO 映射与权限计算
  utils.ts       响应、鉴权与校验工具
  tests/         依赖 Mock 的集成测试，随目录一同移除
  tsconfig.json  Mock 专属类型检查
```

Mock 只在开发模式、目录存在且 `VITE_API_MOCK=true` 时加载；生产构建不包含此实现。Vite 的 `build/optional-mock.ts` 提供可选适配器，前端只引用虚拟模块，不通过文件路径导入 Mock。

依赖方向为 `mock/ → src/api/types 等前端契约和无状态工具`；Mock 不是独立后端，不用于部署。Worker 不依赖此目录。所有记录及账号均是内存演示数据，刷新后恢复，不与 D1 同步。

根目录的 `pnpm run check` 在目录存在时检查 Mock 类型和测试；删除后自动跳过。替换步骤见 [接入自有后端](../docs/backend-replacement.md)。
