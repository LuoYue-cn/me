<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const token = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  const t = token.value.trim()
  if (!t) {
    error.value = '请输入 Token'
    return
  }
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

      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">
        需要 GitHub Personal Access Token 才能管理内容。
      </p>

      <div class="form-group">
        <label class="form-label">GitHub Token</label>
        <input
          v-model="token"
          type="password"
          class="form-input"
          placeholder="ghp_xxxxxxxxxxxx"
          @keyup.enter="handleLogin"
        />
      </div>

      <div v-if="error" class="error-text">
        {{ error }}
      </div>

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
          <li>勾选 <code>repo</code> 权限（完全控制仓库）</li>
          <li>生成后复制 Token，粘贴到上面输入框</li>
          <li>⚠️ Token 只存在你浏览器里，不会上传到其他服务器</li>
        </ol>
      </details>
    </div>
  </div>
</template>
