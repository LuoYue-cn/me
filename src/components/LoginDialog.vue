<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import config from '../config.js'

const store = useAppStore()
const password = ref('')
const token = ref('')
const error = ref('')
const loading = ref(false)

const oauthUrl = computed(() => {
  const base = 'https://github.com/login/oauth/authorize'
  const params = new URLSearchParams({
    client_id: 'Ov23liH0dS1485d58SxJ',
    redirect_uri: config.oauthWorkerUrl + '/callback',
    scope: 'repo',
  })
  return base + '?' + params
})

async function handlePasswordLogin() {
  const pwd = password.value.trim()
  if (!pwd) { error.value = '请输入密码'; return }
  error.value = ''
  loading.value = true
  try {
    await store.loginWithPassword(pwd)
    store.showLogin = false
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleTokenLogin() {
  const t = token.value.trim()
  if (!t) { error.value = '请输入 Token'; return }
  error.value = ''
  loading.value = true
  try {
    await store.login(t)
    store.showLogin = false
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function close() {
  store.showLogin = false
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">🔑 管理登录</div>

      <!-- 密码登录 -->
      <div class="form-group">
        <label class="form-label">密码登录</label>
        <input v-model="password" type="password" class="form-input"
          placeholder="输入密码" @keyup.enter="handlePasswordLogin" />
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:16px"
        :disabled="loading" @click="handlePasswordLogin">
        {{ loading ? '验证中...' : '登录' }}
      </button>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
        <span style="font-size:12px;color:var(--text-muted)">其他方式</span>
        <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
      </div>

      <!-- GitHub OAuth -->
      <a :href="oauthUrl" class="btn" style="width:100%;justify-content:center;text-decoration:none;margin-bottom:8px">
        🔑 使用 GitHub 登录
      </a>

      <!-- Token -->
      <input v-model="token" type="password" class="form-input" style="margin-bottom:8px"
        placeholder="GitHub Token" @keyup.enter="handleTokenLogin" />
      <div class="form-actions" style="margin:0">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="loading" @click="handleTokenLogin">
          {{ loading ? '验证中...' : 'Token 登录' }}
        </button>
      </div>

      <div v-if="error" class="error-text" style="margin-top:12px">{{ error }}</div>
    </div>
  </div>
</template>
