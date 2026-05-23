// 环境变量（在 Cloudflare Dashboard 设置）：
//   ADMIN_PASSWORD  — 你的管理密码          → Fxr13142%
//   GITHUB_TOKEN    — 有 repo 权限的 Token  → 你生成一个
//   TOKEN_SECRET    — 签名 session 用        → 随便写个长字符串
//   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / REDIRECT_URI — OAuth 用
//   SITE_URL        — https://me.h666h.com

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    // 预检请求直接返回
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 状态页面
    if (path === '/' || path === '') {
      return new Response('me.h666h.com Worker OK', { status: 200 })
    }

    // 诊断：测试 token 是否有效（GET）
    if (path === '/api/check-token') {
      const testPayload = await signToken('test', env.TOKEN_SECRET)
      const testVerify = await verifyToken(testPayload, env.TOKEN_SECRET)
      return json({
        hasTokenSecret: !!env.TOKEN_SECRET,
        hasGitHubToken: !!env.GITHUB_TOKEN,
        hasPassword: !!env.ADMIN_PASSWORD,
        signVerifyWorks: !!testVerify,
        testPayload,
      })
    }

    // === 代理读取（通过 Worker 的 Token，避免限速） ===
    if (path === '/api/read') {
      const res = await fetch(
        `https://api.github.com/repos/LuoYue-cn/me/contents/data/data.json`,
        {
          headers: {
            'User-Agent': 'me.h666h.com-worker',
            Accept: 'application/vnd.github.v3+json',
            ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
          },
        }
      )
      const ghText = await res.text()
      return new Response(ghText, {
        status: res.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // === 密码认证 ===
    if (path === '/api/auth' && method === 'POST') {
      const { password } = await request.json()
      if (password !== env.ADMIN_PASSWORD) return json({ error: '密码错误' }, 401)
      const token = await signToken('admin', env.TOKEN_SECRET)
      return json({ token })
    }

    // === 写入 GitHub（代理保存） ===
    if (path === '/api/save' && method === 'POST') {
      try {
        const body = await request.json()
        const payload = await verifyToken(body.token, env.TOKEN_SECRET)
        if (!payload) return json({ error: '登录已过期，请重新登录' }, 401)
        if (!env.GITHUB_TOKEN) return json({ error: 'Worker 未配置 GITHUB_TOKEN' }, 500)
        const ghRes = await fetch(
          `https://api.github.com/repos/LuoYue-cn/me/contents/data/data.json`,
          {
            method: 'PUT',
            headers: {
              'User-Agent': 'me.h666h.com-worker',
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
        const ghText = await ghRes.text()
        let ghData
        try { ghData = JSON.parse(ghText) } catch { return json({ error: 'GitHub 返回非 JSON: ' + ghText.slice(0, 200) }, 500) }
        if (!ghRes.ok) return json({ error: 'GitHub: ' + (ghData.message || ghRes.status) }, 500)
        return json({ sha: ghData.content.sha })
      } catch (e) {
        return json({ error: 'Worker 内部错误: ' + e.message }, 500)
      }
    }

    // === 文件上传 ===
    if (path === '/api/upload' && method === 'POST') {
      try {
        const body = await request.json()
        const payload = await verifyToken(body.token, env.TOKEN_SECRET)
        if (!payload) return json({ error: '登录已过期' }, 401)
        if (!env.GITHUB_TOKEN) return json({ error: 'Worker 未配置 GITHUB_TOKEN' }, 500)

        const filename = Date.now() + '-' + body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const ghRes = await fetch(
          `https://api.github.com/repos/LuoYue-cn/me/contents/attachments/${filename}`,
          {
            method: 'PUT',
            headers: {
              'User-Agent': 'me.h666h.com-worker',
              Accept: 'application/vnd.github.v3+json',
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `上传附件: ${body.filename}`,
              content: body.content,
              branch: 'main',
            }),
          }
        )
        const ghData = await ghRes.json()
        if (!ghRes.ok) return json({ error: ghData.message }, 500)
        return json({
          url: `https://raw.githubusercontent.com/LuoYue-cn/me/main/attachments/${filename}`,
          name: body.filename,
        })
      } catch (e) {
        return json({ error: '上传失败: ' + e.message }, 500)
      }
    }

    // === OAuth 回调 ===
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

    return json({ error: 'Not Found' }, 404)
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
