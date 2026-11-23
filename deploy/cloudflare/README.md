# 可选部署辅助

此目录保存项目的可选部署实现及代理测试，不包含业务接口或数据库模型。

普通前端使用无需配置此目录：执行 `npm run dev:demo` 体验展示，或配置后端地址后执行 `npm run dev`。生产静态文件使用 `npm run build` 生成。

- `build.mjs`：专用构建入口，普通构建不调用。
- `worker.mjs`：静态页面与 API 转发实现。
- `demo-cleanup.mjs`：展示数据库的定时清理入口。启用后按北京时间每日 00:00 清理访客新增的业务行及其关联，保留已核验的官方数据和审计记录。基线缺失或保留记录仍依赖待清理数据时，整批回滚。
- `tests/`：代理路径边界、请求转发与错误响应测试。

保留此目录不影响普通前端使用。通用发布要求见 [生产部署说明](../../docs/deployment.md)，目录职责见 [项目目录说明](../../docs/project-structure.md)。

展示部署使用项目锁定的 Cloudflare CLI 和 Vite 插件。使用 Node.js 24.22.0 或更新的 24.x 运行 `npm run build:cloudflare` 和 `npm run check:cloudflare`。如果上一个版本由 Script API 上传，接管前先比对自定义域名、路由和绑定，再对已预检的产物执行一次 `npm run deploy:cloudflare -- --force`。之后照常使用 Git 构建部署。
