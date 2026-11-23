# 浏览器回归

从模板仓库根目录执行以下命令。测试需要 Node.js 22.13 或更新版本。

```sh
npm ci
npm --prefix tests/browser ci
npm --prefix tests/browser exec -- playwright install chromium
npm --prefix tests/browser test
```

测试以 Chromium 打开临时构建的核心前端。Vite 在本机随机端口提供页面，同源 API 交给参考 Worker，数据库使用重新执行迁移的内存 SQLite。每条用例生成独立的测试账号凭据，结束后关闭服务并清理临时构建。浏览器仅访问本机测试地址。

覆盖登录与刷新受保护地址、角色授权变更后的菜单与 API 权限，以及撤销其他会话后旧浏览器返回登录页。GitHub Actions 会运行同一套检查。
