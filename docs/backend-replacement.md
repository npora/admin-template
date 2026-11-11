# 接入自己的后端

脚手架只使用真实 HTTP 请求，不包含内存 Mock。正式权限 SQL、前端与展示后端独立维护，使用者无需删除任何文件。

## 接入步骤

1. 在空 MySQL 数据库依次导入 [正式建表和基础权限 SQL](../database/mysql/README.md)。后端已有自己的表结构时，可以自行映射相同语义。
2. 后端实现 [接口契约](api.md)，负责账号初始化、密码哈希、认证、接口授权、数据校验和事务。
3. 在本机 `.env.development.local` 配置：

   ```dotenv
   VITE_API_URL=http://localhost:8080
   VITE_DEMO_ENABLED=false
   ```

4. 执行 `npm run dev`。请求默认以 `/api` 开头，开发代理移除该前缀后转发至后端；修改配置后重启开发服务。
5. 执行 `npm run check`、`npm run build`，并验证实际登录、权限与管理接口。

前端 API 模块位于 `src/api/modules/`，DTO 位于 `src/api/types/`，默认响应是 `{ code: 0, message, data }`。两个业务客户端统一解包，只返回 `data`；其他协议集中在 `src/api/protocol/` 适配。Token 默认通过 Bearer 头传递。

## 演示与核心的边界

```text
自己的页面 → src/api/ → 自己的 HTTP 后端
展示页面   → src/api/ → 独立测试 API
```

- `src/`：核心与系统管理页面，不直接导入 `examples/` 或测试后端。
- `database/`：正式 SQL，保留用户/角色/部门/菜单和按钮权限模型。
- `examples/`：仅展示模式加载的页面、统计接口和示例数据。
- `workers/api/`：展示网站的独立后端，不在普通前端开发或构建时启动、部署。
- `deploy/`：可选部署实现，普通静态构建无需使用。

测试后端的种子包含演示菜单；正式 SQL 不含演示菜单。核心模式应连接返回核心页面的后端，`npm run dev:demo` 则用于完整体验测试服务。核心路由不会静默接受未注册的演示页面。

## 生产部署

`npm run build` 默认只输出核心前端，`npm run build:demo` 输出展示前端。生产均请求相对的 `/api`，需要站点服务器转发至实际后端；开发用的 `VITE_API_URL` 不会创建生产代理。History 页面回退与 API 转发应分开配置，详见 [通用部署说明](deployment.md)。

前端环境变量会进入浏览器，不保存密码或服务端密钥。展示账号不代表实际后端初始化账号。

## 是否需要删除目录

不需要。未开启展示模式时，普通构建不导入演示页面。仅在主动精简源码时，可以移除 `examples/`、`workers/` 等可选目录；保留 `src/`、`database/`、`build/`、`scripts/` 和所需配置。

运行 `npm run check:standalone` 会在临时副本中验证不包含演示页面、测试后端和部署实现的核心前端，不会删除工作区文件或连接远程服务。
