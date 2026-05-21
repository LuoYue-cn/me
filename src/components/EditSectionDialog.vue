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
  skills: (store.profile.skills || []).map(s => ({ ...s })),
})

const error = ref('')

watch(() => props.section, (newSec) => {
  form.title = newSec.title
  form.content = newSec.content || ''
}, { deep: true })

function close() { store.showEditSection = null }

function addSkill() { form.skills.push({ name: '', level: 50 }) }
function removeSkill(i) { form.skills.splice(i, 1) }

async function save() {
  if (!form.title) { error.value = '标题不能为空'; return }
  error.value = ''

  store.updateSection(props.section.id, {
    title: form.title,
    content: form.content,
  })
  store.updateProfile({ skills: form.skills.filter(s => s.name) })

  try { await store.save(); close() }
  catch (e) { error.value = '保存失败: ' + e.message }
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

      <!-- 技能 -->
      <div class="form-group">
        <label class="form-label">编程语言掌握度</label>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div v-for="(sk, i) in form.skills" :key="i" class="skill-editor-row">
            <input v-model="sk.name" class="form-input" placeholder="语言" style="flex:0 0 90px" />
            <input type="range" v-model.number="sk.level" min="0" max="100" class="form-range" style="flex:1" />
            <span style="font-size:13px;color:var(--text-secondary);flex:0 0 32px;text-align:right">{{ sk.level }}%</span>
            <button class="btn btn-sm btn-ghost" style="color:var(--danger);flex-shrink:0" @click="removeSkill(i)">✕</button>
          </div>
        </div>
        <button class="btn btn-sm" style="margin-top:6px" @click="addSkill">＋ 添加语言</button>
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
