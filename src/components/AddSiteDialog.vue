<script setup>
import { ref, reactive } from 'vue'
import { useAppStore } from '../stores/app.js'
import { uploadFile } from '../api/github.js'

const store = useAppStore()

const entryType = ref('link')
const uploading = ref(false)
const attachments = ref([])

async function handleUpload(e) {
  const file = e.target.files?.[0]
  if (!file || file.size > 5 * 1024 * 1024) { alert('文件不能超过 5MB'); return }
  uploading.value = true
  try {
    const result = await uploadFile(file, store.workerToken)
    attachments.value.push(result)
  } catch (e) { alert('上传失败: ' + e.message) }
  finally { uploading.value = false; e.target.value = '' }
}

function removeAttach(i) { attachments.value.splice(i, 1) }
function nowLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
}
const init = nowLocal()
const form = reactive({
  name: '', url: '', description: '', icon: '',
  content: '',
  date: init.date,
  time: init.time,
  tags: '',
})

const error = ref('')

function close() { store.showAddSite = false }

async function save() {
  if (entryType.value === 'link' && (!form.name || !form.url)) {
    error.value = '名称和 URL 为必填'; return
  }
  if (entryType.value === 'post' && !form.content.trim()) {
    error.value = '内容不能为空'; return
  }
  error.value = ''
  const base = {
    type: entryType.value,
    date: form.date + 'T' + (form.time || '00:00'),
    tags: form.tags.split(/[,，、\s]+/).filter(Boolean).slice(0, 5),
  }
  const extra = attachments.value.length ? { attachments: [...attachments.value] } : {}
  if (entryType.value === 'post') {
    store.addWebsite({ ...base, content: form.content, icon: form.icon, ...extra })
  } else if (entryType.value === 'blog') {
    if (!form.name.trim()) { error.value = '标题不能为空'; return }
    store.addWebsite({ ...base, name: form.name, description: form.description, content: form.content, icon: form.icon, ...extra })
  } else {
    store.addWebsite({
      ...base, name: form.name,
      url: form.url.startsWith('http') ? form.url : 'https://' + form.url,
      description: form.description, icon: form.icon,
    })
  }
  try { await store.save(); close() }
  catch (e) { error.value = '保存失败: ' + e.message }
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">＋ 添加</div>
      <div v-if="error" class="error-text">{{ error }}</div>

      <!-- 类型选择 -->
      <div class="form-group">
        <label class="form-label">类型</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" :class="{ 'btn-primary': entryType === 'link' }" @click="entryType = 'link'">链接</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': entryType === 'post' }" @click="entryType = 'post'">说说</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': entryType === 'blog' }" @click="entryType = 'blog'">博客</button>
        </div>
      </div>

      <!-- 链接字段 -->
      <template v-if="entryType === 'link'">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">名称 *</label>
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
        </div>
      </template>

      <!-- 博客字段 -->
      <template v-else-if="entryType === 'blog'">
        <div class="form-group">
          <label class="form-label">标题 *</label>
          <input v-model="form.name" class="form-input" placeholder="文章标题" />
        </div>
        <div class="form-group">
          <label class="form-label">简介</label>
          <input v-model="form.description" class="form-input" placeholder="一句话简介" />
        </div>
        <div class="form-group">
          <label class="form-label">内容（支持 Markdown）</label>
          <textarea v-model="form.content" class="form-textarea" rows="8" placeholder="粘贴 Markdown 内容..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" placeholder="可选" />
        </div>
        <div class="form-group">
          <label class="form-label">附件</label>
          <input type="file" @change="handleUpload" :disabled="uploading" />
          <div v-if="uploading" style="font-size:13px;color:var(--text-muted)">上传中…</div>
          <div v-for="(a,i) in attachments" :key="i" style="font-size:13px;margin-top:4px">
            📎 {{ a.name }} <span style="color:var(--danger);cursor:pointer" @click="removeAttach(i)">✕</span>
          </div>
        </div>
      </template>

      <!-- 说说字段 -->
      <template v-else-if="entryType === 'post'">
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea v-model="form.content" class="form-textarea" rows="4" placeholder="写点什么…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" placeholder="可选，如 📷 或图片链接" />
        </div>
        <div class="form-group">
          <label class="form-label">附件</label>
          <input type="file" @change="handleUpload" :disabled="uploading" />
          <div v-if="uploading" style="font-size:13px;color:var(--text-muted)">上传中…</div>
          <div v-for="(a,i) in attachments" :key="i" style="font-size:13px;margin-top:4px">
            📎 {{ a.name }} <span style="color:var(--danger);cursor:pointer" @click="removeAttach(i)">✕</span>
          </div>
        </div>
      </template>

      <!-- 公共字段 -->
      <div class="form-row" style="grid-template-columns:1fr 1fr 1fr">
        <div class="form-group">
          <label class="form-label">日期</label>
          <input v-model="form.date" type="date" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">时间</label>
          <input v-model="form.time" type="time" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">标签</label>
          <input v-model="form.tags" class="form-input" placeholder="空格" />
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
