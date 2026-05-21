<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import config from '../config.js'

const store = useAppStore()

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

function close() {
  store.showLogin = false
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">🔑 管理员登录</div>

      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">
        需要一个有 <code>repo</code> 权限的 GitHub Token 来管理内容。
      </p>

      <div class="form-group">
        <label class="form-label">GitHub Token</label>
        <input v-model="token" type="password" class="form-input"
          placeholder="ghp_xxxxxxxxxxxx" @keyup.enter="handleLogin" />
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="form-actions" style="flex-direction:column;gap:8px">
        <a :href="oauthUrl" class="btn btn-primary" style="width:100%;justify-content:center;text-decoration:none">
          🔑 使用 GitHub 登录
        </a>

        <div style="display:flex;align-items:center;gap:12px;margin:4px 0">
          <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
          <span style="font-size:12px;color:var(--text-muted)">或者手动输入 Token</span>
          <hr style="flex:1;border:none;border-top:1px solid var(--border)" />
        </div>

        <input v-model="token" type="password" class="form-input"
          placeholder="ghp_xxxxxxxxxxxx" @keyup.enter="handleLogin" />

        <div v-if="error" class="error-text">{{ error }}</div>

        <button class="btn" style="width:100%;justify-content:center" :disabled="loading" @click="handleLogin">
          {{ loading ? '验证中...' : '登录' }}
        </button>
        <a href="https://github.com/settings/tokens/new?description=me.h666h.com&scopes=repo" target="_blank"
          class="btn" style="width:100%;justify-content:center;text-decoration:none;font-size:13px">
          生成 Token
        </a>
      </div>
    </div>
  </div>
</template>
