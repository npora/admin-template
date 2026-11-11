# 项目目录职责

| 目录                 | 用途                             |
| -------------------- | -------------------------------- |
| `src/api/`           | 接口、DTO 类型、统一协议适配     |
| `src/assets/`        | 参与打包的样式和资源             |
| `src/components/`    | 公共界面组件，统一表格和分页     |
| `src/config/`        | 应用、语言和环境变量配置         |
| `src/constants/`     | 菜单、存储等共享常量             |
| `src/icons/`         | 图标注册与图标类型               |
| `src/directives/`    | 按钮权限等指令                   |
| `src/composables/`   | 组合式逻辑                       |
| `src/layout/`        | 侧栏、页头、标签页和内容区       |
| `src/locales/`       | 中英文词条和语言运行时           |
| `src/router/`        | 常量路由、动态路由和页面扩展入口 |
| `src/startup/`       | 主模块加载前的启动动画和错误重试 |
| `src/store/`         | 用户会话、权限、主题、标签等状态 |
| `src/types/`         | 全局声明与自动生成的组件类型     |
| `src/services/`      | 会话协调服务                     |
| `src/utils/`         | 权限、媒体查询、存储等工具       |
| `src/views/`         | 核心首页、登录、异常页和系统管理 |
| `public/`            | 原样输出的静态资源               |
| `build/`             | 公共 Vite 配置和启动加载层       |
| `scripts/`、`tests/` | 检查命令、核心回归与测试辅助     |
| `database/mysql/`    | 正式表结构和基础权限数据         |
| `docs/`              | 使用说明与接口约定               |

`workers/api/` 仅 Worker 预设包含，提供独立后端源码、SQLite 迁移、初始化脚本和后端测试。前端不导入其源码。

`node_modules/`、`dist/`、`report.html` 可以重新生成，不提交版本控制。不要删除正式 SQL 或本机密钥资料。添加业务页面时使用 `src/views/`，后端菜单的 `component` 必须对应已存在的页面入口。

字典页面在 `src/views/system/dict/`，请求与 DTO 在 `src/api/modules/dict.ts`、`src/api/types/dict.ts`，业务读取使用 `src/composables/useDict.ts`、`src/store/modules/dict/` 和 `src/components/DictTag/`。这些均为核心内容，详见 [字典管理](dictionaries.md)。
