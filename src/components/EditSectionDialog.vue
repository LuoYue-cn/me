<script setup>
import { ref, reactive, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

const props = defineProps({
  section: { type: Object, required: true },
})

const store = useAppStore()

const form = reactive({
  title: props.section.title,
  content: props.section.content || '',
})

const error = ref('')

watch(() => props.section, (newSec) => {
  form.title = newSec.title
  form.content = newSec.content || ''
}, { deep: true })

function close() {
  store.showEditSection = null
}

async function save() {
  if (!form.title) {
    error.value = '标题不能为空'
    return
  }
  error.value = ''

  store.updateSection(props.section.id, {
    title: form.title,
    content: form.content,
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
      <div class="dialog-title">✏ 编辑区块</div>

      <div v-if="error" class="error-text">
        {{ error }}
      </div>

      <div class="form-group">
        <label class="form-label">标题</label>
        <input v-model="form.title" class="form-input" />
      </div>

      <div class="form-group">
        <label class="form-label">内容</label>
        <textarea v-model="form.content" class="form-textarea" rows="6" placeholder="支持多行文本"></textarea>
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
