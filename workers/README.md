# 部署 OAuth Worker（免费，无需信用卡）

全程在网页上操作，不需要装任何东西。

---

## 1. 注册 Cloudflare

打开 **https://dash.cloudflare.com/sign-up** → 用邮箱注册

> 如果你已经有 Cloudflare 账号，直接登录

---

## 2. 创建 Worker

1. 打开 **https://dash.cloudflare.com** → 左侧 **Workers & Pages**
2. 点 **创建应用程序** → **创建 Worker**
3. 名称填 **`me-oauth`**（或者你喜欢的名字）
4. 点 **部署**

---

## 3. 粘贴代码

1. 在 Worker 编辑器中，全选替换成 `workers/oauth.js` 里的内容
2. 点 **保存并部署**

---

## 4. 设置环境变量

1. 在 Worker 页面点 **设置** → **变量**
2. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `GITHUB_CLIENT_ID` | `Ov23liH0dS1485d58SxJ` |
| `GITHUB_CLIENT_SECRET` | 见下一步 |
| `REDIRECT_URI` | `https://me-oauth.你的用户名.workers.dev/callback` |
| `SITE_URL` | `https://me.h666h.com` |

---

## 5. 生成 Client Secret

1. 打开 **https://github.com/settings/developers**
2. 找到你之前创建的 OAuth App
3. 点 **Generate a new client secret**
4. 复制生成的 secret，填到上一步的 `GITHUB_CLIENT_SECRET`

---

## 6. 更新 GitHub OAuth App 回调地址

还是在 GitHub OAuth App 设置页面：
- **Authorization callback URL** 改为：`https://me-oauth.你的用户名.workers.dev/callback`

> 把 `你的用户名` 换成你的 Cloudflare 账号邮箱前缀，或者你在第 2 步填的 Worker 名称

---

## 7. 更新前端配置

打开 `src/config.js`，改 `oauthWorkerUrl`：

```js
oauthWorkerUrl: 'https://me-oauth.你的用户名.workers.dev',
```

---

## 8. 推送代码

```bash
git add .
git commit -m "add oauth login"
git push
```

等 GitHub Actions 绿勾后，打开网站 → 右上角 **🔑 管理登录** → **使用 GitHub 登录** → 授权 → 自动登录。
