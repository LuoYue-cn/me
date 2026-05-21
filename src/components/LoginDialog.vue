<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { requestDeviceCode, pollAccessToken, verifyToken, saveToken } from '../api/github.js'

const store = useAppStore()

const token = ref('')
const error = ref('')
const loading = ref(false)

const deviceMode = ref(false)
const deviceCode = ref('')
const deviceUrl = ref('')
const polling = ref(false)

async function handleLogin() {
  const t = token.value.trim()
  if (!t) { error.value = '请输入 Token'; return }
  error.value = ''
  loading.value = true
  try {
    await store.login(t)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function startDeviceFlow() {
  error.value = ''
  polling.value = true
  try {
    const data = await requestDeviceCode()
    deviceCode.value = data.user_code
    deviceUrl.value = data.verification_uri

    // 开始轮询
    const poll = async () => {
      const token = await pollAccessToken(data.device_code, data.interval)
      if (token) {
        // 验证并登录
        const username = await verifyToken(token)
        if (username) {
          saveToken(token)
          store.user = username
          store.showLogin = false
          return
        }
        throw new Error('Token 验证失败')
      }
      // 没授权，继续轮询
      setTimeout(poll, (data.interval || 5) * 1000)
    }
    poll()
  } catch (e) {
    error.value = e.message
    polling.value = false
  }
}

function close() {
  store.showLogin = false
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">🔑 管理员登录</div>

      <!-- Device Flow 模式：显示验证码 -->
      <template v-if="deviceMode && deviceCode">
        <div style="text-align:center;padding:16px 0">
          <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">
            在浏览器中打开下面网址，输入验证码：
          </p>
          <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:8px">
            <a :href="deviceUrl" target="_blank">{{ deviceUrl }}</a>
          </div>
          <div style="font-size:32px;font-weight:800;letter-spacing:6px;background:var(--bg);padding:12px 20px;border-radius:10px;display:inline-block;margin:8px 0">
            {{ deviceCode }}
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px">
            等待授权中...
          </div>
        </div>
        <div v-if="error" class="error-text">{{ error }}</div>
        <div class="form-actions">
          <button class="btn" @click="close">取消</button>
        </div>
      </template>

      <!-- Token 输入模式 -->
      <template v-else>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">
          方式一：用 GitHub 账号快速登录
        </p>
        <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:20px"
          :disabled="polling" @click="startDeviceFlow">
          {{ polling ? '获取验证码中...' : '🔑 使用 GitHub 登录' }}
        </button>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
          <span style="font-size:13px;color:var(--text-muted)">或者手动输入 Token</span>
          <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
        </div>

        <div class="form-group">
          <label class="form-label">GitHub Token</label>
          <input v-model="token" type="password" class="form-input"
            placeholder="ghp_xxxxxxxxxxxx" @keyup.enter="handleLogin" />
        </div>

        <div v-if="error" class="error-text">{{ error }}</div>

        <div class="form-actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn btn-primary" :disabled="loading" @click="handleLogin">
            {{ loading ? '验证中...' : '登录' }}
          </button>
        </div>

        <details style="margin-top:16px;font-size:13px;color:var(--text-muted)">
          <summary>如何获取 Token？</summary>
          <ol style="margin-top:8px;padding-left:20px;line-height:1.8">
            <li>打开 <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a></li>
            <li>点击「Generate new token (classic)」</li>
            <li>勾选 <code>repo</code> 权限</li>
            <li>生成后复制 Token，粘贴到上面输入框</li>
          </ol>
        </details>
      </template>
    </div>
  </div>
</template>
