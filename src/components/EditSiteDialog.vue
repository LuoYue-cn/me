<script setup>
import { ref, reactive, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

const props = defineProps({
  site: { type: Object, required: true },
})

const store = useAppStore()

const form = reactive({
  name: props.site.name,
  url: props.site.url,
  description: props.site.description || '',
  date: props.site.date || '',
  icon: props.site.icon || '',
  tags: (props.site.tags || []).join(' '),
})

const error = ref('')

// 如果外部传入的 site 变了，更新表单
watch(() => props.site, (newSite) => {
  form.name = newSite.name
  form.url = newSite.url
  form.description = newSite.description || ''
  form.date = newSite.date || ''
  form.icon = newSite.icon || ''
  form.tags = (newSite.tags || []).join(' ')
}, { deep: true })

function close() {
  store.showEditSite = null
}

async function save() {
  if (!form.name || !form.url) {
    error.value = '网站名称和 URL 为必填'
    return
  }
  error.value = ''

  store.updateWebsite(props.site.id, {
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
      <div class="dialog-title">✏ 编辑网站</div>

      <div v-if="error" class="error-text">
        {{ error }}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">网站名称 *</label>
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
        <input v-model="form.icon" class="form-input" placeholder="https://example.com/favicon.ico" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">发布日期</label>
          <input v-model="form.date" type="date" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">标签</label>
          <input v-model="form.tags" class="form-input" placeholder="博客 技术" />
        </div>
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
