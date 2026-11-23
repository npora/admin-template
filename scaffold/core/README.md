# Npora Admin

Vue 3、TypeScript、Element Plus 和 Pinia 后台脚手架。包含动态菜单与搜索、系统管理、字典、会话管理、权限预览和操作审计。主题、菜单布局和页签样式可在应用设置中调整。

## 开始开发

建议使用 Node.js 24 LTS，可使用 npm、pnpm 或 Yarn。

```sh
npm install
npm run dev
```

在 `.env.development` 设置 `VITE_API_URL`，按 [接口契约](docs/api.md) 对接自己的后端。账号由后端初始化。纯净版仅包含 MySQL 数据库文件，Google Authenticator 默认关闭。

`npm run build` 将应用构建到 `dist/`，生产环境请转发 `/api`。运行 `npm run check` 检查格式、类型和核心行为。

## 使用指南

- [会话管理与权限预览](docs/account-management.md) · [登录与账号安全](docs/authentication.md)
- [MySQL 新库初始化和迁移](database/mysql/README.md) · [权限模型](docs/rbac.md)
- [开发配置](docs/development.md) · [新增业务页面](docs/new-business-page.md) · [目录职责](docs/project-structure.md)
- [应用设置、菜单搜索与缓存](docs/development.md#本地偏好与缓存)

[完整展示网站](https://admin.npora.live) 可使用公开演示账号 `admin`、密码 `123456` 登录。体验安全操作请使用自己创建的测试账号。

[变更记录](CHANGELOG.md) · [MIT 许可证](LICENSE)
