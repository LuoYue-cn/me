<script setup>
import { ref, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const rendered = ref('')

const blog = () => store.data?.websites?.find(s => s.id === store.showBlog) || {}

watch(() => store.showBlog, async (id) => {
  if (!id) { rendered.value = ''; return }
  const b = blog()
  if (!b || !b.content) { rendered.value = ''; return }
  rendered.value = await renderMd(b.content)
}, { immediate: true })

let _marked = null
async function getMarked() {
  if (!_marked) {
    const mod = await import('https://cdn.jsdelivr.net/npm/marked@15/lib/marked.umd.min.js')
    _marked = mod.marked || mod.default || mod
  }
  return _marked
}

async function renderMd(text) {
  if (!text) return ''
  try {
    const marked = await getMarked()
    return marked.parse(text, { breaks: true })
  } catch {
    return text.replace(/\n/g, '<br>')
  }
}

async function openInTab() {
  const b = blog()
  if (!b || !b.content) return
  const body = await renderMd(b.content)
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${b.name}</title>
<style>body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.8 sans-serif;color:#333}
h1,h2,h3{color:#1a1a1a}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:14px}
img{max-width:100%;border-radius:8px;margin:12px 0}blockquote{border-left:4px solid #ddd;margin:12px 0;padding:4px 16px;color:#666}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
hr{margin:20px 0;border:none;border-top:1px solid #ddd}
.date{color:#999;font-size:14px;margin-bottom:24px}</style></head><body>
<h1>${b.name}</h1>
<div class="date">${b.date?.slice(0,10) || ''}</div>
${body}
</body></html>`
  const w = window.open()
  if (w) { w.document.write(html); w.document.close() }
}

function close() { store.showBlog = null }
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog" style="max-width:640px">
      <div class="dialog-title" style="margin-bottom:4px">{{ blog().name || '文章' }}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">{{ blog().date?.slice(0,10) }}</div>
      <div class="blog-content" v-html="rendered || '加载中…'"></div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn" @click="close">关闭</button>
        <button class="btn btn-primary" @click="openInTab">📄 新标签页查看</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blog-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  word-break: break-word;
  max-height: 60vh;
  overflow-y: auto;
}
.blog-content :deep(h1),
.blog-content :deep(h2),
.blog-content :deep(h3) { margin: 16px 0 8px; color: var(--text); }
.blog-content :deep(p) { margin: 8px 0; }
.blog-content :deep(pre) { background: var(--bg); padding: 12px; border-radius: 8px; overflow-x: auto; }
.blog-content :deep(code) { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-size: 14px; }
.blog-content :deep(img) { max-width: 100%; border-radius: 8px; margin: 8px 0; }
.blog-content :deep(a) { color: var(--accent); }
.blog-content :deep(li) { margin-left: 20px; }
</style>
