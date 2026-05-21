<script setup>
import { ref, reactive, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const props = defineProps({ site: { type: Object, required: true } })

function splitDate(v) {
  if (!v) return { date: '', time: '' }
  const [d, t = ''] = v.split('T')
  return { date: d, time: t ? t.slice(0, 5) : '' }
}
const init = splitDate(props.site.date)
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
  if (form.type === 'post') {
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

      <template v-else>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea v-model="form.content" class="form-textarea" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">图标 URL</label>
          <input v-model="form.icon" class="form-input" placeholder="可选" />
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
