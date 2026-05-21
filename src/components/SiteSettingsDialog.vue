<script setup>
import { reactive } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const PRESETS = [
  { id: 'ocean',    name: '深海' },
  { id: 'sunset',   name: '日落' },
  { id: 'forest',   name: '森林' },
  { id: 'midnight', name: '暗夜' },
  { id: 'cherry',   name: '樱桃' },
  { id: 'aurora',   name: '极光' },
  { id: 'rose',     name: '玫瑰' },
  { id: 'white',    name: '纯白' },
]

const THEMES = [
  { id: 'smooth',    name: '平滑' },
  { id: 'cyberpunk', name: '赛博朋克' },
  { id: 'aero',      name: 'Aero 玻璃' },
  { id: 'lineart',   name: '纯线条' },
  { id: 'terminal',  name: '终端' },
  { id: 'minimal',   name: '极简' },
  { id: 'retro',     name: '复古' },
  { id: 'dark',      name: '暗夜' },
  { id: 'neon',      name: '霓虹' },
  { id: 'frost',     name: '毛玻璃' },
]

const s = store.data.settings || {}
const form = reactive({
  bgType: s.bgType,
  bgPreset: s.bgPreset,
  bgCustom: s.bgCustom,
  bgCustomUrls: (s.bgCustomUrls || []).map(u => ({ ...u })),
  bgCustomActive: s.bgCustomActive ?? 0,
  bgBlur: s.bgBlur,
  cardBlur: s.cardBlur ?? 10,
  cardOpacity: s.cardOpacity,
  theme: s.theme || 'smooth',
})

const newUrl = reactive({ value: '' })

function close() {
  store.showSettings = false
}

function selectPreset(id) {
  form.bgPreset = id
  form.bgType = 'preset'
}

function addUrl() {
  const v = newUrl.value.trim()
  if (!v) return
  form.bgCustomUrls.push({ url: v, label: v.replace(/^https?:\/\//, '').slice(0, 30) })
  newUrl.value = ''
}

function removeUrl(index) {
  form.bgCustomUrls.splice(index, 1)
  if (form.bgCustomActive >= form.bgCustomUrls.length) {
    form.bgCustomActive = Math.max(0, form.bgCustomUrls.length - 1)
  }
}

function selectUrl(index) {
  form.bgCustomActive = index
}

const activeCustomUrl = () => {
  if (!form.bgCustomUrls.length) return form.bgCustom || ''
  return form.bgCustomUrls[form.bgCustomActive]?.url || ''
}

function selectTheme(id) {
  form.theme = id
  document.documentElement.setAttribute('data-theme', id)
}

async function save() {
  store.updateSettings({ ...form, bgCustomUrls: form.bgCustomUrls.map(u => ({ ...u })) })
  applySettings(form)
  try {
    await store.save()
    close()
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

function applySettings(f) {
  document.documentElement.setAttribute('data-theme', f.theme || 'smooth')
  document.documentElement.style.setProperty('--card-bg-alpha', f.cardOpacity)
  document.documentElement.style.setProperty('--bg-blur', f.bgBlur + 'px')
  document.documentElement.style.setProperty('--card-blur', (f.cardBlur ?? 10) + 'px')

  const bg = document.getElementById('app-bg')
  if (!bg) return
  if (f.bgType === 'custom') {
    const url = activeCustomUrl()
    if (url) {
      bg.style.backgroundImage = `url(${url})`
      bg.className = 'app-bg'
      return
    }
  }
  bg.style.backgroundImage = ''
  bg.className = 'app-bg bg-preset-' + (f.bgPreset || 'ocean')
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog" style="max-width:560px">
      <div class="dialog-title">🎨 网站设置</div>

      <!-- 背景类型 -->
      <div class="form-group">
        <label class="form-label">背景类型</label>
        <div style="display:flex;gap:8px">
          <button
            class="btn btn-sm"
            :class="{ 'btn-primary': form.bgType === 'preset' }"
            @click="form.bgType = 'preset'"
          >预设</button>
          <button
            class="btn btn-sm"
            :class="{ 'btn-primary': form.bgType === 'custom' }"
            @click="form.bgType = 'custom'"
          >自定义图片</button>
        </div>
      </div>

      <!-- 预设选择 -->
      <div class="form-group" v-if="form.bgType === 'preset'">
        <label class="form-label">选择预设</label>
        <div class="preset-grid">
          <div
            v-for="p in PRESETS"
            :key="p.id"
            class="preset-item"
            :class="{ active: form.bgPreset === p.id }"
            @click="selectPreset(p.id)"
          >
            <div class="preset-preview" :class="'bg-preset-' + p.id"></div>
            <span class="preset-name">{{ p.name }}</span>
          </div>
        </div>
      </div>

      <!-- 自定义图片 URL 列表 -->
      <div class="form-group" v-if="form.bgType === 'custom'">
        <label class="form-label">背景图片</label>
        <div class="url-list">
          <div v-for="(item, i) in form.bgCustomUrls" :key="i"
            class="url-item"
            :class="{ active: form.bgCustomActive === i }"
            @click="selectUrl(i)"
          >
            <span class="url-radio">●</span>
            <span class="url-label">{{ item.label || item.url }}</span>
            <button class="btn btn-sm btn-ghost" style="color:var(--danger);flex-shrink:0;padding:0 4px" @click.stop="removeUrl(i)">✕</button>
          </div>
        </div>
        <div v-if="!form.bgCustomUrls.length" style="font-size:13px;color:var(--text-muted);margin-bottom:6px">
          还没有添加背景图片
        </div>
        <div style="display:flex;gap:6px">
          <input v-model="newUrl.value" class="form-input" placeholder="https://example.com/bg.jpg" @keyup.enter="addUrl" />
          <button class="btn btn-sm btn-primary" @click="addUrl" :disabled="!newUrl.value.trim()">添加</button>
        </div>
      </div>

      <!-- 背景图片模糊 -->
      <div class="form-group">
        <label class="form-label">背景图片模糊：{{ form.bgBlur }}px</label>
        <input type="range" v-model.number="form.bgBlur" min="0" max="40" class="form-range" />
      </div>

      <!-- 卡片毛玻璃模糊 -->
      <div class="form-group">
        <label class="form-label">卡片磨砂感：{{ form.cardBlur }}px</label>
        <input type="range" v-model.number="form.cardBlur" min="0" max="30" class="form-range" />
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">0 = 实心卡片，越大越模糊</div>
      </div>

      <!-- 卡片透明度 -->
      <div class="form-group">
        <label class="form-label">卡片透明度：{{ Math.round(form.cardOpacity * 100) }}%</label>
        <input type="range" v-model.number="form.cardOpacity" min="0.3" max="1" step="0.01" class="form-range" />
      </div>

      <!-- 主题选择 -->
      <div class="form-group">
        <label class="form-label">主题风格</label>
        <div class="theme-grid">
          <div v-for="t in THEMES" :key="t.id" class="theme-item"
            :class="{ active: form.theme === t.id }"
            @click="selectTheme(t.id)">
            <div class="theme-swatch" :data-theme="t.id"></div>
            <span class="theme-name">{{ t.name }}</span>
          </div>
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
