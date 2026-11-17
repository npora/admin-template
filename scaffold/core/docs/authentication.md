# 登录与账号安全

界面配置集中在 `src/config/auth.ts`，环境差异写入 `.env.development.local`：

```dotenv
VITE_AUTHENTICATOR_ENABLED=false
VITE_PASSWORD_RESET_CONTACT=
```

验证器默认关闭。开启后显示登录动态码输入框与个人中心的绑定页签。管理员联系方式留空时只提示联系管理员，填写后会公开显示。前端开关只控制界面，不能绕过后端已启用的动态码校验。密钥、密码和验证器加密主密钥不能放进任何 `VITE_` 配置。

## 保持登录

登录页支持“保持登录 7 天”，只持久保存 Token 与绝对过期时间，不保存密码；未勾选时使用原有存储策略及参考后端的 1 小时会话。刷新权限不续期，退出和切换账号清理记录，过期后由后端拒绝。`VITE_TOKEN_STORAGE=memory` 时不显示保持登录选项，也不持久化 Token。

自己的后端需支持 `rememberMe?: boolean`，返回 `accessToken` 和 `expiresAt`（Unix 毫秒），并独立验证会话有效期。不能只延长浏览器缓存时间。

## 忘记密码

采用联系管理员重置，不需要配置邮件服务。用户管理的“重置密码”仅超级管理员可见；后端必须校验超级管理员身份和其当前密码，再对新密码进行哈希并撤销目标账号的旧会话。新密码为 12–128 字符，不允许重置其他超级管理员的密码。

重置密码不解除验证器；验证器丢失需由运维核验身份后处理绑定记录，并撤销会话，不能开放匿名绕过接口。

## 后端认证配置与测试

前端入口开关保留在根目录 `.env` 的 `VITE_AUTHENTICATOR_ENABLED`，默认 `false`。后端公共认证默认值集中在 `workers/api/src/config/auth.mjs`：验证器新绑定默认关闭，签发者为 `Npora Admin`，普通会话 1 小时、保持登录 7 天；登录及绑定接口共同读取此配置。独立 Worker 的环境变量 `AUTH_TOTP_ENABLED`、`AUTH_TOTP_ISSUER` 可以覆盖对应默认值，便于同一套源码在测试环境开启。

`AUTH_TOTP_KEY` 仍只从后端私密环境读取，不放进认证配置源码，也不能复制到前端 `.env`。无 Worker 的纯净版由自己的后端实现同样的校验。

测试顺序：

1. 在自己的测试环境设置前端 `VITE_AUTHENTICATOR_ENABLED=true`，重启开发服务或重新构建。
2. 测试后端设置 `AUTH_TOTP_ENABLED=true`，并配置有效的 `AUTH_TOTP_KEY`；可选设置 `AUTH_TOTP_ISSUER`。默认模板保持关闭。
3. 先用账号密码登录，在个人中心的验证器页签创建密钥，用 Google Authenticator 添加账号并输入动态码确认绑定。
4. 绑定会撤销原会话。等待下一个动态码后重新登录：不填或填错动态码应失败；正确动态码应成功；同一个动态码不能再次使用。

开启功能不会自动给所有账号绑定验证器；未绑定账号仍可使用账号密码登录。关闭界面入口或新绑定开关，也不会跳过已有绑定账号的动态码校验。

完整仓库可执行 `node --test workers/api/tests/authenticator.test.mjs`，用隔离 SQLite 验证上述登录、绑定、错误动态码、重放和会话撤销流程，不修改线上账号。

## 可选验证器

这是 Google Authenticator 的 TOTP 动态码，不是 Google OAuth 登录。开启后，在个人中心验证密码、创建密钥，再在 Google Authenticator 中选择“输入设置密钥”、填写当前账号及密钥、选择“基于时间”，输入动态码确认。待绑定设置 5 分钟后过期；绑定和解绑均要求当前密码，成功后撤销旧会话并重新登录。验证码仅允许使用一次，需要等待下一个动态码再登录。

正式后端可按需执行 `database/mysql/05-authenticator.sql`；已有库仅增量执行尚未执行的文件，不重跑初始化。后端加密保存密钥，并使用数据库条件更新防止并发重放。MySQL 接入需自行实现会话撤销及登录竞态检查。

Worker 预设的后端配置：`AUTH_TOTP_ENABLED=true` 允许绑定，`AUTH_TOTP_KEY` 是仅保存在后端私密配置的 32 字节随机值（64 位小写十六进制），`AUTH_TOTP_ISSUER` 默认为 `Npora Admin`。已有绑定使用的加密密钥必须保留，关闭绑定开关不会跳过已有账号的动态码校验。Worker 所有部署都需按顺序应用新增的 `0007_totp.sql`、`0008_millisecond_timestamps.sql`，因为登录事务也检查绑定状态；未包含 Worker 的纯净版按自有后端方案接入。

接口、DTO 和管理员重置密码契约见 [接口文档](api.md)，正式数据库见 [MySQL 说明](../database/mysql/README.md)。
