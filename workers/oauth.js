// 环境变量（在 Cloudflare Dashboard 设置）：
//   ADMIN_PASSWORD  — 你的管理密码          → Fxr13142%
//   GITHUB_TOKEN    — 有 repo 权限的 Token  → 你生成一个
//   TOKEN_SECRET    — 签名 session 用        → 随便写个长字符串
//   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / REDIRECT_URI — OAuth 用
//   SITE_URL        — https://me.h666h.com

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // 状态页面
    if (path === '/' || path === '') {
      return new Response('me.h666h.com Worker OK', { status: 200 })
    }

    // === 密码认证 ===
    if (path === '/api/auth' && method === 'POST') {
      const { password } = await request.json()
      if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: '密码错误' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
      // 用 Web Crypto 签发一个带过期时间的 token
      const token = await signToken('admin', env.TOKEN_SECRET)
      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // === 写入 GitHub（代理保存） ===
    if (path === '/api/save' && method === 'POST') {
      const body = await request.json()
      // 校验 token
      const payload = await verifyToken(body.token, env.TOKEN_SECRET)
      if (!payload) {
        return new Response(JSON.stringify({ error: '登录已过期，请重新登录' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
      // 用 Worker 自己的 GITHUB_TOKEN 写入 GitHub
      const ghRes = await fetch(
        `https://api.github.com/repos/LuoYue-cn/me/contents/data/data.json`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '通过 Worker 保存',
            content: body.content,
            sha: body.sha || undefined,
            branch: 'main',
          }),
        }
      )
      const ghData = await ghRes.json()
      if (!ghRes.ok) {
        return new Response(JSON.stringify({ error: ghData.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ sha: ghData.content.sha }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // === OAuth 回调（不变） ===
    if (path === '/callback') {
      const code = url.searchParams.get('code')
      if (!code) return new Response('Missing code', { status: 400 })
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID || 'Ov23liH0dS1485d58SxJ',
          client_secret: env.GITHUB_CLIENT_SECRET || 'd07f038129816bb95bfeaa4a6ee5f99336a04abe',
          code, redirect_uri: env.REDIRECT_URI || 'https://me-oauth.fxr20110402.workers.dev/callback',
        }),
      })
      const data = await tokenRes.json()
      if (data.error) return new Response('Error: ' + (data.error_description || data.error), { status: 400 })
      return Response.redirect(`${env.SITE_URL || 'https://me.h666h.com'}#token=${data.access_token}`, 302)
    }

    return new Response('Not Found', { status: 404 })
  },
}

// ============ HMAC 签名工具 ============

async function signToken(username, secret) {
  const encoder = new TextEncoder()
  const payload = JSON.stringify({ u: username, exp: Date.now() + 86400000 })
  const b64payload = btoa(payload)
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(b64payload))
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return b64payload + '.' + b64sig
}

async function verifyToken(token, secret) {
  if (!token || !secret) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64payload, b64sig] = parts
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const sig = new Uint8Array(atob(b64sig).split('').map(c => c.charCodeAt(0)))
  const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(b64payload))
  if (!valid) return null
  const payload = JSON.parse(atob(b64payload))
  if (payload.exp < Date.now()) return null
  return payload
}
