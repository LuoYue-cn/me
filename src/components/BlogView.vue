<script setup>
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const blog = () => store.data?.websites?.find(s => s.id === store.showBlog) || {}
function close() { store.showBlog = null }
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="dialog" style="max-width:640px">
      <div class="dialog-title" style="margin-bottom:4px">{{ blog().name || '文章' }}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">{{ blog().date?.slice(0,10) }}</div>
      <div class="blog-content">{{ blog().content || '暂无内容' }}</div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blog-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
