/**
 * GitHub OAuth 回调处理 — 部署到 Cloudflare Workers
 *
 * 使用方法：
 * 1. 去 https://github.com/settings/developers 找到你的 OAuth App
 * 2. 点 Generate new client secret，复制 secret
 * 3. 去 https://dash.cloudflare.com → Workers & Pages → 创建 Worker
 * 4. 粘贴本文件内容
 * 5. 设置环境变量（Settings → Variables）：
 *    - GITHUB_CLIENT_ID: Ov23liH0dS1485d58SxJ
 *    - GITHUB_CLIENT_SECRET: 你刚才生成的 secret
 *    - REDIRECT_URI: https://你的worker名.workers.dev/callback
 *    - SITE_URL: https://me.h666h.com
 * 6. 在 GitHub OAuth App 设置中：
 *    Authorization callback URL = https://你的worker名.workers.dev/callback
 * 7. 部署后把 worker 地址填到 src/config.js 的 oauthWorkerUrl
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // 首页 — 简易状态页
    if (path === '/' || path === '') {
      return new Response('GitHub OAuth Worker OK', { status: 200 })
    }

    // GitHub OAuth 回调
    if (path === '/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code) {
        return new Response('Missing code', { status: 400 })
      }

      // 换 token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.REDIRECT_URI,
        }),
      })
      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        return new Response(`Error: ${tokenData.error_description || tokenData.error}`, { status: 400 })
      }

      // 重定向回网站，token 在 hash 中（不经过服务器日志）
      const siteUrl = env.SITE_URL || 'https://me.h666h.com'
      return Response.redirect(`${siteUrl}#token=${tokenData.access_token}`, 302)
    }

    return new Response('Not Found', { status: 404 })
  },
}
