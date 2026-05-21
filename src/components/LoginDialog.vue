<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const password = ref('')
const error = ref('')
const loading = ref(false)

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

function close() {
  store.showLogin = false
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">🔑 管理登录</div>

      <div class="form-group">
        <label class="form-label">密码</label>
        <input v-model="password" type="password" class="form-input"
          placeholder="输入密码" @keyup.enter="handlePasswordLogin" />
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="form-actions">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="loading" @click="handlePasswordLogin">
          {{ loading ? '验证中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
