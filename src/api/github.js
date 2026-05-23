/**
 * GitHub API 封装
 * 所有读写操作都通过这个模块完成
 */
import config from '../config.js'

const GITHUB_API = 'https://api.github.com'

/**
 * 从 GitHub 读取数据文件
 */
export async function fetchData(useWorker) {
  const url = useWorker
    ? `${config.oauthWorkerUrl}/api/read`
    : `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${config.dataPath}`
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

export function encodeBase64(str) {
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
// Worker 密码认证 + 代理保存
// ==========================================

const WORKER = config.oauthWorkerUrl

/**
 * 用密码登录，获取 session token
 */
export async function workerAuth(password) {
  const res = await fetch(WORKER + '/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '认证失败')
  return data.token
}

/**
 * 通过 Worker 保存数据（无需自己的 GitHub Token）
 */
export async function workerSave(content, sha, token) {
  const res = await fetch(WORKER + '/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, content, sha }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '保存失败')
  return data.sha
}

/**
 * 通过 Worker 上传文件
 */
export async function uploadFile(file, token) {
  const base64 = await fileToBase64(file)
  const res = await fetch(WORKER + '/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, filename: file.name, content: base64.split(',')[1] || base64 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data // { url, name }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
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
