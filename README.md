# me.h666h.com — 个人主页 + 网站导航

基于 **Vue 3 + Vite** 构建，数据存储在 GitHub 仓库中，通过 GitHub API 在线管理。

## ✨ 功能

- 📄 个人主页：头像、简介、社交链接
- 📅 网站时间轴：按年份/日期展示你做的网站
- ✏️ 全部内容在浏览器里在线编辑
- 🔄 修改即保存，实时生效
- 🆓 零成本部署在 GitHub Pages

## 🚀 快速开始

### 1. 克隆或初始化仓库

```bash
git init
git add .
git commit -m "init"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地预览

```bash
npm run dev
```

浏览器打开 `http://localhost:5173` 即可看到效果。

### 4. 修改配置

编辑 `src/config.js`，填入你的 GitHub 信息：

```js
owner: 'LuoYue-cn',           // 你的 GitHub 用户名
repo: 'me',                   // 仓库名
```

### 5. 推送到 GitHub

```bash
# 在 GitHub 上建一个空仓库（不要勾选 README / .gitignore）
git remote add origin https://github.com/你的用户名/me.git
git push -u origin main
```

### 6. 开启 GitHub Pages

- 进入仓库 → **Settings** → **Pages**
- **Source** 选 **GitHub Actions**
- 推送后 Actions 会自动构建部署

### 7. 绑定自定义域名（可选）

- 在仓库 Settings → Pages → 设置 **Custom domain** 为 `me.h666h.com`
- 在域名 DNS 设置中添加 **CNAME** 记录：`me` → `你的用户名.github.io`

## 🔑 管理后台

### 方式一：Personal Access Token（推荐）

1. 打开 https://github.com/settings/tokens → **Generate new token (classic)**
2. 勾选 `repo` 权限
3. 生成 Token，复制保存
4. 打开你的网站 → 点右上角 **管理登录** → 粘贴 Token → 登录

### 方式二：OAuth App（需要配置后端，更安全）

TODO: 后续补充

## 📁 项目结构

```
me/
├── data/
│   └── data.json           ← 所有数据（在 GitHub 仓库里）
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   └── github.js       ← GitHub API 通信
│   ├── components/
│   │   ├── ProfileSection.vue
│   │   ├── TimelineSection.vue    ← 时间轴
│   │   ├── TextSection.vue
│   │   ├── AddSiteDialog.vue
│   │   ├── EditSiteDialog.vue
│   │   ├── EditProfileDialog.vue
│   │   ├── EditSectionDialog.vue
│   │   ├── LoginDialog.vue
│   │   └── ConfirmDialog.vue
│   ├── stores/
│   │   └── app.js           ← 状态管理
│   ├── styles/
│   │   └── main.css
│   ├── config.js            ← 配置
│   ├── App.vue
│   └── main.js
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🛠 技术栈

| 工具 | 用途 |
|------|------|
| Vue 3 | 前端框架 |
| Vite | 构建工具 |
| Pinia | 状态管理 |
| GitHub API | 数据持久化 |
| GitHub Pages | 部署托管 |
| GitHub Actions | 自动构建部署 |

## 📝 数据格式

数据全在 `data/data.json` 中，结构清晰，方便二次处理：

```json
{
  "profile": { "name": "名字", "bio": "简介", ... },
  "sections": [ ... ],     // 页面区块配置
  "websites": [             // 网站列表
    {
      "id": "xxx",
      "name": "网站名",
      "url": "https://...",
      "description": "描述",
      "date": "2024-06-15",
      "tags": ["博客"]
    }
  ]
}
```

## 📄 许可

MIT
