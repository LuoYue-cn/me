export default {
  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    // === 在这里填你的配置 ===
    const GITHUB_CLIENT_ID = 'Ov23liH0dS1485d58SxJ'
    const GITHUB_CLIENT_SECRET = 'd07f038129816bb95bfeaa4a6ee5f99336a04abe'
    const REDIRECT_URI = 'https://me-oauth.fxr20110402.workers.dev/callback'
    const SITE_URL = 'https://me.h666h.com'

    if (path === '/' || path === '') {
      return new Response('GitHub OAuth Worker OK', { status: 200 })
    }

    if (path === '/callback') {
      const code = url.searchParams.get('code')
      if (!code) return new Response('Missing code', { status: 400 })

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })
      const data = await tokenRes.json()

      if (data.error) {
        return new Response(`Error: ${data.error_description || data.error}`, { status: 400 })
      }

      return Response.redirect(`${SITE_URL}#token=${data.access_token}`, 302)
    }

    return new Response('Not Found', { status: 404 })
  },
}
