# 登录与账号安全

登录页包含账号密码、“记住我”和“忘记密码”。可选 Google Authenticator 使用标准 TOTP 动态码，默认关闭，不需要 Google OAuth 客户端或 Google 账号。

## 前端配置

界面配置集中在 `src/config/auth.ts`，环境差异写入 `.env.development.local` 或构建环境：

```dotenv
VITE_AUTHENTICATOR_ENABLED=false
VITE_PASSWORD_RESET_CONTACT=
```

`VITE_AUTHENTICATOR_ENABLED=true` 显示登录动态码输入框及个人中心的验证器页签。`VITE_PASSWORD_RESET_CONTACT` 是公开展示给用户的管理员联系方式，留空时提示联系管理员。前端开关不影响后端对已绑定账号的强制校验；遇到动态码缺失提示时，登录页也会显示输入框。

前端不能保存验证器密钥、加密主密钥或密码。`VITE_` 配置会进入公开构建产物。

## 记住我

不勾选时，参考后端签发 1 小时会话；勾选时为 7 天。前端只保存 Token 和绝对过期时间，不保存密码，刷新权限不会延长过期时间。退出或切换账号清理持久记录；后端撤销或过期后不能继续使用。

`VITE_TOKEN_STORAGE` 保留原有默认 Token 存储策略。勾选“记住我”后会单独保存到本机存储；使用 `memory` 模式时隐藏“记住我”选项且不持久化。接入自有后端时应返回 `expiresAt`（Unix 毫秒），并在服务器验证会话有效期。

## 忘记密码与修改密码

登录页的“忘记密码”进入 `/forgot-password`。已绑定 Google Authenticator 的用户输入账号、当前动态码和新密码即可自助重置。未绑定或丢失验证器时联系管理员。参考后端按 IP 和账号限制尝试次数，账号不存在、未绑定和动态码错误使用相同的失败响应。

个人中心的“修改密码”要求当前密码，已绑定验证器的账号还要输入动态码。新密码为 12–128 个字符。两种流程都在后端写入新密码哈希并撤销该账号的全部旧会话。使用过的动态码不能再用于登录或改密，验证器绑定继续生效。前端清理 Token、路由、权限、标签页和字典缓存后返回登录。

超级管理员仍可在用户管理验证自己的当前密码后重置目标账号密码。此操作不能用于其他超级管理员。

| 接口                         | 请求                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `POST /auth/password/reset`  | 公开接口，提交 `{ username, totpCode, newPassword }`                              |
| `POST /auth/password/change` | Bearer Token，提交 `{ currentPassword, newPassword, totpCode? }`                  |
| `GET /auth/totp`             | Bearer Token，返回验证器的 `{ available, enabled }`，用于显示改密时的动态码输入框 |

两种密码接口成功均返回 `data: null`。纯净版应由自有后端实现这些契约。后端不提供验证器时，`GET /auth/totp` 为已登录用户返回 `{ available: false, enabled: false }`。

Worker 可通过 `AUTH_PASSWORD_ITERATIONS=600000` 将新写入的 PBKDF2-HMAC-SHA256 密码哈希升级为 60 万次迭代。已有的 10 万次哈希继续可登录，在下次改密或重置时升级。默认保留 10 万次以兼容 CPU 配额有限的部署。启用前验证登录与改密耗时；启用后保持此配置。

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

## 从用户管理创建绑定

开启前端入口后，超级管理员可在用户管理的“更多 → 管理验证器”中为其他用户创建绑定。输入当前管理员密码后，系统生成设置密钥并立即启用，不需要目标用户把动态码交给管理员确认。用户将这次生成的密钥添加到自己手机的 Google Authenticator，即可用密码和动态码登录。

设置密钥仅本次显示，创建成功后弹窗继续显示密钥，保存后点击“已保存，完成”关闭。创建已经生效，关闭弹窗不会取消绑定；已有绑定不会被覆盖。密钥属于长期凭据，应妥善交给目标用户。列表在实际创建或解绑时刷新一次，后续关闭不重复刷新；创建前关闭不会刷新。操作仅撤销目标用户会话。

个人中心与用户管理复用 `src/components/AuthenticatorSettings/`。用户在个人中心自行绑定仍通过密码和动态码确认，解绑后可重新绑定以更换验证器；用户管理中操作自己的账号也使用该个人流程。

管理员接口为 `GET /system/users/:id/totp`、`POST /system/users/:id/totp/setup` 和 `POST /system/users/:id/totp/disable`。创建提交 `{ password }`（管理员当前密码），返回 `{ secret, uri }` 并立即生效；解绑提交 `{ password, code }`，`code` 为目标账号的当前动态码。后端独立检查超级管理员标记、有效会话及目标账号状态，禁止管理其他超级管理员，普通管理员角色不能调用。列表 DTO 的 `authenticatorEnabled` 只表示生效的绑定，不返回设置密钥。
