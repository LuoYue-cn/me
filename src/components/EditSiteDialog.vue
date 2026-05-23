<script setup>
import { ref, reactive, watch } from 'vue'
import { useAppStore } from '../stores/app.js'
import { uploadFile } from '../api/github.js'

const store = useAppStore()

const props = defineProps({ site: { type: Object, required: true } })

function splitDate(v) {
  if (!v) return { date: '', time: '' }
  const [d, t = ''] = v.split('T')
  return { date: d, time: t ? t.slice(0, 5) : '' }
}
const init = splitDate(props.site.date)
const attachments = ref((props.site.attachments || []).map(a => ({ ...a })))
const uploading = ref(false)
const extName = ref('')
const extUrl = ref('')

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
const editIdx = ref(-1)
const editData = reactive({ name: '', url: '' })
function startEdit(i) { editIdx.value = i; editData.name = attachments.value[i].name; editData.url = attachments.value[i].url }
function saveEdit() { if (editIdx.value >= 0) Object.assign(attachments.value[editIdx.value], { name: editData.name, url: editData.url }); editIdx.value = -1 }
function addExtLink() {
  const url = extUrl.value.trim(); const name = extName.value.trim() || url
  if (!url) return
  attachments.value.push({ name, url })
  extName.value = ''; extUrl.value = ''
}

const form = reactive({
  type: props.site.type || 'link',
  name: props.site.name || '',
  url: props.site.url || '',
  description: props.site.description || '',
  icon: props.site.icon || '',
  content: props.site.content || '',
  date: init.date,
  time: init.time,
  tags: (props.site.tags || []).join(' '),
})

const error = ref('')

watch(() => props.site, (ns) => {
  form.type = ns.type || 'link'
  form.name = ns.name || ''
  form.url = ns.url || ''
  form.description = ns.description || ''
  form.icon = ns.icon || ''
  form.content = ns.content || ''
  const sd = splitDate(ns.date)
  form.date = sd.date
  form.time = sd.time
  form.tags = (ns.tags || []).join(' ')
}, { deep: true })

function close() { store.showEditSite = null }

async function save() {
  if (form.type === 'link' && (!form.name || !form.url)) {
    error.value = '名称和 URL 为必填'; return
  }
  if (form.type === 'post' && !form.content.trim()) {
    error.value = '内容不能为空'; return
  }
  error.value = ''

  const updates = {
    type: form.type,
    date: form.date + 'T' + (form.time || '00:00'),
    tags: form.tags.split(/[,，、\s]+/).filter(Boolean).slice(0, 5),
  }
  if (attachments.value.length) updates.attachments = attachments.value.map(a => ({ ...a }))
  if (form.type === 'post') {
    updates.content = form.content
    updates.icon = form.icon
  } else if (form.type === 'blog') {
    updates.name = form.name
    updates.description = form.description
    updates.content = form.content
    updates.icon = form.icon
  } else {
    updates.name = form.name
    updates.url = form.url.startsWith('http') ? form.url : 'https://' + form.url
    updates.description = form.description
    updates.icon = form.icon
  }
  store.updateWebsite(props.site.id, updates)
  try { await store.save(); close() }
  catch (e) { error.value = '保存失败: ' + e.message }
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dialog-title">✏ 编辑</div>
      <div v-if="error" class="error-text">{{ error }}</div>

      <!-- 类型 -->
      <div class="form-group">
        <label class="form-label">类型</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" :class="{ 'btn-primary': form.type === 'link' }" @click="form.type = 'link'">链接</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': form.type === 'post' }" @click="form.type = 'post'">说说</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': form.type === 'blog' }" @click="form.type = 'blog'">博客</button>
        </div>
      </div>

      <template v-if="form.type === 'link'">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">名称 *</label>
            <input v-model="form.name" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">URL *</label>
            <input v-model="form.url" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <input v-model="form.description" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" />
        </div>
      </template>

      <!-- 博客 -->
      <template v-else-if="form.type === 'blog'">
        <div class="form-group">
          <label class="form-label">标题 *</label>
          <input v-model="form.name" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">简介</label>
          <input v-model="form.description" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea v-model="form.content" class="form-textarea" rows="8"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">附件 / 外链</label>
          <input type="file" @change="handleUpload" :disabled="uploading" style="display:block;margin-bottom:6px" />
          <div style="display:flex;gap:6px">
            <input v-model="extName" class="form-input" placeholder="名称" style="flex:0 0 80px" />
            <input v-model="extUrl" class="form-input" placeholder="外部链接 URL" @keyup.enter="addExtLink" />
            <button class="btn btn-sm btn-primary" @click="addExtLink">添加</button>
          </div>
          <div v-if="uploading" style="font-size:13px;color:var(--text-muted);margin-top:4px">上传中…</div>
          <div v-for="(a,i) in attachments" :key="i" style="font-size:13px;margin-top:4px">
            <template v-if="editIdx === i">
              <input v-model="editData.name" class="form-input" placeholder="名称" style="width:80px;display:inline;margin-right:4px" />
              <input v-model="editData.url" class="form-input" placeholder="URL" style="width:200px;display:inline;margin-right:4px" />
              <button class="btn btn-sm btn-primary" @click="saveEdit">✔</button>
              <button class="btn btn-sm" @click="editIdx = -1">✕</button>
            </template>
            <template v-else>
              <span class="attach-item">
                <a :href="a.url" target="_blank" style="color:var(--accent)">📎 {{ a.name }}</a>
                <button class="btn btn-sm btn-ghost" @click="startEdit(i)" style="padding:0 4px;font-size:12px">✏</button>
                <button class="btn btn-sm btn-ghost" @click="removeAttach(i)" style="padding:0 4px;font-size:12px;color:var(--danger)">✕</button>
              </span>
            </template>
          </div>
        </div>
      </template>

      <!-- 说说 -->
      <template v-else>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea v-model="form.content" class="form-textarea" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" placeholder="可选" />
        </div>
        <div class="form-group">
          <label class="form-label">附件 / 外链</label>
          <input type="file" @change="handleUpload" :disabled="uploading" style="display:block;margin-bottom:6px" />
          <div style="display:flex;gap:6px">
            <input v-model="extName" class="form-input" placeholder="名称" style="flex:0 0 80px" />
            <input v-model="extUrl" class="form-input" placeholder="外部链接 URL" @keyup.enter="addExtLink" />
            <button class="btn btn-sm btn-primary" @click="addExtLink">添加</button>
          </div>
          <div v-if="uploading" style="font-size:13px;color:var(--text-muted);margin-top:4px">上传中…</div>
          <div v-for="(a,i) in attachments" :key="i" style="font-size:13px;margin-top:4px">
            <template v-if="editIdx === i">
              <input v-model="editData.name" class="form-input" placeholder="名称" style="width:80px;display:inline;margin-right:4px" />
              <input v-model="editData.url" class="form-input" placeholder="URL" style="width:200px;display:inline;margin-right:4px" />
              <button class="btn btn-sm btn-primary" @click="saveEdit">✔</button>
              <button class="btn btn-sm" @click="editIdx = -1">✕</button>
            </template>
            <template v-else>
              <span class="attach-item">
                <a :href="a.url" target="_blank" style="color:var(--accent)">📎 {{ a.name }}</a>
                <button class="btn btn-sm btn-ghost" @click="startEdit(i)" style="padding:0 4px;font-size:12px">✏</button>
                <button class="btn btn-sm btn-ghost" @click="removeAttach(i)" style="padding:0 4px;font-size:12px;color:var(--danger)">✕</button>
              </span>
            </template>
          </div>
        </div>
      </template>

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
        <button class="btn btn-primary" :disabled="store.saving" @click="save">{{ store.saving ? '保存中...' : '💾 保存' }}</button>
      </div>
    </div>
  </div>
</template>
