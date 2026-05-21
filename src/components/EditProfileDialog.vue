<script setup>
import { reactive } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const form = reactive({
  name: store.profile.name,
  bio: store.profile.bio,
  avatar: store.profile.avatar,
  social: store.profile.social.map(s => ({ ...s, show: s.show !== false })),
})

function close() {
  store.showEditProfile = false
}

function addSocial() {
  form.social.push({ platform: '', url: '', icon: '', show: true })
}

function removeSocial(index) {
  form.social.splice(index, 1)
}

function moveUp(index) {
  if (index <= 0) return
  const item = form.social.splice(index, 1)[0]
  form.social.splice(index - 1, 0, item)
}

function moveDown(index) {
  if (index >= form.social.length - 1) return
  const item = form.social.splice(index, 1)[0]
  form.social.splice(index + 1, 0, item)
}

async function save() {
  store.updateProfile({
    name: form.name,
    bio: form.bio,
    avatar: form.avatar,
    social: form.social.filter(s => s.platform && s.url),
  })
  try {
    await store.save()
    close()
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog" style="max-width:540px">
      <div class="dialog-title">✏ 编辑个人信息</div>

      <div class="form-group">
        <label class="form-label">名字</label>
        <input v-model="form.name" class="form-input" placeholder="你的名字" />
      </div>

      <div class="form-group">
        <label class="form-label">简介</label>
        <textarea v-model="form.bio" class="form-textarea" rows="3" placeholder="一句话介绍自己，支持换行"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">头像 URL</label>
        <input v-model="form.avatar" class="form-input" placeholder="https://avatars.githubusercontent.com/..." />
      </div>

      <div class="form-group">
        <label class="form-label">
          社交链接
          <span style="font-weight:400;font-size:12px;color:var(--text-muted)">（关闭的链接主页上将隐藏）</span>
        </label>
        <div class="social-editor-grid">
          <div v-for="(s, i) in form.social" :key="i" class="social-editor-card">
            <div class="form-group">
              <label class="form-label">名称</label>
              <input v-model="s.platform" class="form-input" placeholder="GitHub" />
            </div>
            <div class="form-group">
              <label class="form-label">链接</label>
              <input v-model="s.url" class="form-input" placeholder="https://github.com/xxx" />
            </div>
            <div class="social-editor-actions">
              <label class="toggle-wrap">
                <span style="font-size:12px">{{ s.show ? '显示' : '隐藏' }}</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="s.show" />
                  <span class="toggle-slider"></span>
                </label>
              </label>
              <div style="display:flex;gap:4px">
                <button class="btn btn-sm btn-ghost" @click="moveUp(i)" :disabled="i === 0">▲</button>
                <button class="btn btn-sm btn-ghost" @click="moveDown(i)" :disabled="i === form.social.length - 1">▼</button>
                <button class="btn btn-sm btn-ghost" style="color:var(--danger)" @click="removeSocial(i)">✕</button>
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-sm" style="margin-top:8px" @click="addSocial">＋ 添加链接</button>
      </div>

      <div class="form-actions">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="store.saving" @click="save">
          {{ store.saving ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
