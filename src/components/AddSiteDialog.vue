<script setup>
import { ref, reactive } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const form = reactive({
  name: '',
  url: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  icon: '',
  tags: '',
})

const error = ref('')

function close() {
  store.showAddSite = false
}

async function save() {
  if (!form.name || !form.url) {
    error.value = '网站名称和 URL 为必填'
    return
  }
  error.value = ''

  store.addWebsite({
    name: form.name,
    url: form.url.startsWith('http') ? form.url : 'https://' + form.url,
    description: form.description,
    date: form.date,
    icon: form.icon,
    tags: form.tags
      .split(/[,，、\s]+/)
      .filter(Boolean)
      .slice(0, 5),
  })

  try {
    await store.save()
    close()
  } catch (e) {
    error.value = '保存失败: ' + e.message
  }
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">＋ 添加网站</div>

      <div v-if="error" class="error-text">
        {{ error }}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">网站名称 *</label>
          <input v-model="form.name" class="form-input" placeholder="我的博客" />
        </div>
        <div class="form-group">
          <label class="form-label">URL *</label>
          <input v-model="form.url" class="form-input" placeholder="blog.example.com" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">描述</label>
        <input v-model="form.description" class="form-input" placeholder="一句话描述" />
      </div>

      <div class="form-group">
        <label class="form-label">图标 URL</label>
        <input v-model="form.icon" class="form-input" placeholder="https://example.com/favicon.ico" />
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
          网站 favicon 图标，可选。推荐用 <code>https://www.google.com/s2/favicons?domain=example.com</code>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">发布日期</label>
          <input v-model="form.date" type="date" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">标签（空格分隔）</label>
          <input v-model="form.tags" class="form-input" placeholder="博客 技术" />
        </div>
      </div>

      <div class="form-actions">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="store.saving" @click="save">
          {{ store.saving ? '保存中...' : '💾 添加' }}
        </button>
      </div>
    </div>
  </div>
</template>
