<script setup>
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const blog = () => store.data?.websites?.find(s => s.id === store.showBlog) || {}

function renderMd(text) {
  if (!text) return ''
  let html = text
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 加粗
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return '<p>' + html + '</p>'
}

function openInTab() {
  const b = blog()
  if (!b || !b.content) return
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${b.name}</title>
<style>body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.8 sans-serif;color:#333}
h1,h2,h3{color:#1a1a1a}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:14px}
img{max-width:100%;border-radius:8px;margin:12px 0}blockquote{border-left:4px solid #ddd;margin:12px 0;padding:4px 16px;color:#666}
.date{color:#999;font-size:14px;margin-bottom:24px}</style></head><body>
<h1>${b.name}</h1>
<div class="date">${b.date?.slice(0,10) || ''}</div>
${renderMd(b.content)}
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
      <div class="blog-content" v-html="renderMd(blog().content)"></div>
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
