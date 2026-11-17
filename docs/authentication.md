# 登录与账号安全

登录页包含账号密码、“保持登录 7 天”和“忘记密码”。可选 Google Authenticator 使用标准 TOTP 动态码，默认关闭，不需要 Google OAuth 客户端或 Google 账号。

## 前端配置

界面配置集中在 `src/config/auth.ts`，环境差异写入 `.env.development.local` 或构建环境：

```dotenv
VITE_AUTHENTICATOR_ENABLED=false
VITE_PASSWORD_RESET_CONTACT=
```

`VITE_AUTHENTICATOR_ENABLED=true` 显示登录动态码输入框及个人中心的验证器页签。`VITE_PASSWORD_RESET_CONTACT` 是公开展示给用户的管理员联系方式，留空时提示联系管理员。前端开关不影响后端对已绑定账号的强制校验；遇到动态码缺失提示时，登录页也会显示输入框。

前端不能保存验证器密钥、加密主密钥或密码。`VITE_` 配置会进入公开构建产物。

## 保持登录

不勾选时，参考后端签发 1 小时会话；勾选时为 7 天。前端只保存 Token 和绝对过期时间，不保存密码，刷新权限不会延长过期时间。退出或切换账号清理持久记录；后端撤销或过期后不能继续使用。

`VITE_TOKEN_STORAGE` 保留原有默认 Token 存储策略。保持登录会单独保存到本机存储；使用 `memory` 模式时隐藏保持登录选项且不持久化。接入自有后端时应返回 `expiresAt`（Unix 毫秒），并在服务器验证会话有效期。

## 忘记密码

采用“联系管理员重置”，不发送邮件、不提供匿名密码修改接口。超级管理员在用户管理的“重置密码”中验证自己的当前密码，再设置目标账号的新密码（12–128 字符）。新密码由后端哈希，旧会话立即撤销；普通管理员角色不等于超级管理员，不能执行此操作，也不能重置其他超级管理员的密码。

重置密码不会解除已绑定的验证器。手机丢失时由运维核验身份后处理对应用户的绑定记录，禁止通过匿名接口绕过第二因素。参考后端删除该用户的 `sys_user_totp` 记录会同时撤销旧会话。

## 可选验证器

后端私密配置如下，默认不设置即关闭新绑定：

| 名称                | 用途                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `AUTH_TOTP_ENABLED` | 字符串 `true` 允许新绑定；默认关闭                                          |
| `AUTH_TOTP_KEY`     | 32 字节随机值的 64 位小写十六进制字符串，仅保存在后端私密配置，不能写入 Git |
| `AUTH_TOTP_ISSUER`  | 验证器账号签发者名称，默认 `Npora Admin`                                    |

不要直接替换或删除已有绑定使用的加密主密钥，否则已有密钥无法解密。关闭绑定开关不会关闭已有账号的动态码校验，密钥仍需保留。

启用前先完成数据库迁移。参考后端所有部署都需增量执行新增的 `workers/api/migrations/0007_totp.sql`、`0008_millisecond_timestamps.sql`，因为登录事务也会检查绑定状态；已有库不能重跑旧迁移。正式 MySQL 后端可按需执行 `database/mysql/05-authenticator.sql`；实现绑定变更时需自行同步撤销旧会话和处理登录竞态。

用户在个人中心验证当前密码后开始绑定。Google Authenticator 中选择“输入设置密钥”，填写当前账号、界面显示的密钥并选择“基于时间”；输入动态码确认绑定。待确认设置 5 分钟后过期，取消不会启用。密钥只在本次设置中显示，不上传第三方二维码服务。

使用 SHA-1、6 位数字和 30 秒步长，容许前后各一个时间步的偏差；动态码只允许使用一次，并通过数据库条件更新防止并发重放。绑定或解绑会撤销账号的全部旧会话，需要等待下一个动态码再登录。绑定、解绑需当前密码；登录和安全变更均限流。

## 接口

| 接口                              | 请求 / 返回                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `POST /auth/login`                | `{ username, password, rememberMe?, totpCode? }` → `{ accessToken, expiresAt }` |
| `GET /auth/totp`                  | 登录后返回 `{ available, enabled }`，不返回密钥                                 |
| `POST /auth/totp/setup`           | `{ password }` → `{ secret, uri }`，需开启绑定功能                              |
| `POST /auth/totp/enable`          | `{ password, code }` 确认绑定并撤销旧会话                                       |
| `POST /auth/totp/disable`         | `{ password, code }` 解绑并撤销旧会话                                           |
| `POST /system/users/:id/password` | 超级管理员提交 `{ currentPassword, newPassword }`，重置密码并撤销目标账号旧会话 |

动态码缺失、错误或重复使用返回 HTTP 400、业务码 `10003`；密码错误保持原有登录错误响应。接口通过现有 API 模块调用，不在页面直接访问后端。

算法与运行时依据：[RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html)、[Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)。
