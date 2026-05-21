/**
 * GitHub API 封装
 * 所有读写操作都通过这个模块完成
 */
import config from '../config.js'

const GITHUB_API = 'https://api.github.com'

/**
 * 从 GitHub 读取数据文件
 */
export async function fetchData() {
  const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${config.dataPath}`
  const res = await fetch(url, {
    headers: getHeaders(),
  })

  if (res.status === 404) {
    // 文件还不存在，返回默认数据
    return null
  }
  if (!res.ok) {
    throw new Error(`读取失败: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  // GitHub 返回的是 base64 编码的内容
  const content = decodeBase64(data.content)
  return {
    content: JSON.parse(content),
    sha: data.sha,
  }
}

/**
 * 保存数据到 GitHub
 * @param {object} newData  - 新的完整数据对象
 * @param {string} sha      - 当前文件的 SHA（用于安全更新）
 */
export async function saveData(newData, sha) {
  const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${config.dataPath}`
  const body = {
    message: '更新主页数据',
    content: encodeBase64(JSON.stringify(newData, null, 2)),
    branch: config.branch,
    sha: sha,
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`保存失败: ${res.status} ${await res.text()}`)
  }

  const result = await res.json()
  return result.content.sha // 返回新的 SHA
}

/**
 * 生成请求头
 */
function getHeaders() {
  const headers = { Accept: 'application/vnd.github.v3+json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * 获取存储的 token
 */
function getToken() {
  return localStorage.getItem('github_token')
}

function decodeBase64(str) {
  // 标准 base64 → UTF-8 解码
  return decodeURIComponent(escape(atob(str)))
}

function encodeBase64(str) {
  // UTF-8 → base64 编码
  return btoa(unescape(encodeURIComponent(str)))
}

/**
 * 验证 token 是否有效
 */
export async function verifyToken(token) {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) return null
  const user = await res.json()
  return user.login
}

// ==========================================
// Device Flow (无需服务器的 OAuth 登录)
// ==========================================

/**
 * 第一步：请求设备码和用户码
 */
export async function requestDeviceCode() {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: config.oauthClientId, scope: 'repo' }),
  })
  if (!res.ok) throw new Error('获取设备码失败: ' + res.status)
  return res.json()  // { device_code, user_code, verification_uri, interval }
}

/**
 * 第二步：轮询检查用户是否已授权
 */
export async function pollAccessToken(deviceCode, interval = 5) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.oauthClientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  const data = await res.json()
  if (data.error === 'authorization_pending') return null   // 还没扫码
  if (data.error === 'slow_down') return null                // 轮询太快
  if (data.access_token) return data.access_token
  throw new Error(data.error_description || '授权失败')
}

/**
 * 保存 token 到 localStorage
 */
export function saveToken(token) {
  localStorage.setItem('github_token', token)
}

export function clearToken() {
  localStorage.removeItem('github_token')
}

export function hasToken() {
  return !!localStorage.getItem('github_token')
}
