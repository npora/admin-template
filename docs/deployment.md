# 生产部署与发布检查

模板默认从站点根路径 `/` 提供页面，使用 HTML5 History 路由。构建产物为纯静态前端；生产 Mock 关闭，管理数据需要独立后端。下面是部署说明和配置示例，本仓库未自动发布网站或修改服务器。

## 构建

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm build
pnpm run check:standalone
```

将 `dist/` 的内容上传到静态站点目录。`pnpm preview` 只用于本地检查构建产物，不作为线上服务；参见 [Vite 静态部署说明](https://vite.dev/guide/static-deploy.html)。

构建默认加载 `.env`、可选的 `.env.local`、`.env.production` 和可选的 `.env.production.local`，不会加载 `.env.development.local`。环境值在构建时确定，部署后改服务器上的 `.env` 不会改变已有 JS，需要重新构建。具体规则见 [Vite 环境配置](https://vite.dev/guide/env-and-mode.html)。

## 配置页面回退与 API 转发

| 请求                            | 应返回的内容                                                    |
| ------------------------------- | --------------------------------------------------------------- |
| `/`、`/login`、`/system/user`   | 前端页面；直接访问或刷新深层路径时回退 `index.html`             |
| `/assets/js/…`、`/assets/css/…` | 实际静态文件；文件不存在时返回 404                              |
| `/api/auth/login`               | 真实后端的 `/auth/login`，保留 POST 请求体和响应状态            |
| `/api/system/users`             | 真实后端的 `/system/users`，保留查询参数和 Authorization 请求头 |

`VITE_API_URL` 配置 Vite 代理目标，不会让部署后的静态文件自动获得反向代理。生产由站点服务器或网关转发 `/api`。若修改 `VITE_API_PREFIX`，同时更新转发规则并重新构建。

### Nginx 示例

以下 `server` 块放在 Nginx 的 `http` 配置中。按部署环境修改 `root`、监听端口、域名和后端地址；示例假定 TLS 已由入口网关终止，且后端监听同机 8080 端口。跨服务器时 `127.0.0.1` 应换成后端可达地址。

```nginx
server {
    listen 80;
    server_name admin.example.com;
    root /usr/share/nginx/html;
    index index.html;

    location = /api {
        return 404;
    }

    location ^~ /api/ {
        # 末尾 / 去掉 /api/ 前缀，与开发代理保持一致。
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location ^~ /assets/ {
        try_files $uri =404;
        # 本模板构建的 assets 文件名包含内容哈希。
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

上述前缀替换基于 [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)，页面回退基于 [try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。配置前先在目标服务器执行 `nginx -t`；本机未安装 Nginx，未运行该语法检查或部署验证。

API 路径不要回退前端 HTML，也不要为 API 配置静态资源缓存。构建生成的 `.gz` 文件只有在服务器支持并启用预压缩文件服务时才会使用；未配置时原始 JS/CSS 仍可正常提供。上述配置适用于域名根路径；子目录部署需要一起调整 Vite `base`、Router history base 和站点转发规则。

## 接入自己的后端

保留 `src/api/` 的请求与 DTO 契约，将开发代理目标改为自己的服务，生产配置对应的 `/api` 转发。可删除 `mock/` 和 `workers/`；步骤和独立前端验证见 [后端替换说明](backend-replacement.md)。

新部署的 Worker 使用其自身初始化流程和账号；README 中 `admin / 123456`、`viewer / 123456` 是开发 Mock 的默认账号，不代表所有 Worker 实例的凭据。前端环境文件不存密码或 `AUTH_PEPPER`。

## 发布前逐项确认

- `pnpm run check`、`pnpm build` 和 `pnpm run check:standalone` 通过。
- 深层页面直接访问和刷新正常，缺失 JS/CSS 返回 404，API 响应不被替换成 HTML。
- 登录、退出、权限刷新和只读账号的按钮及直接地址访问符合预期。
- API 转发目标与前缀正确，线上请求没有落到本机或个人开发服务。
- `index.html` 使用重新验证策略，带哈希的资源按版本缓存；发布时避免先删旧资源导致旧页面请求失败。
- 手机布局、语言主题、启动动画与错误重试完成实际浏览器检查。
- 待完成项以 [验收记录](acceptance.md) 为准，不能用自动化通过代替未完成的页面验收。
