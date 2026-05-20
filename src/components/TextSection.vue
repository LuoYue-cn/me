<script setup>
import { useAppStore } from '../stores/app.js'

defineProps({
  section: { type: Object, required: true },
})

const store = useAppStore()
</script>

<template>
  <div class="section-card">
    <div class="section-title">
      <span>{{ section.title }}</span>
      <button
        v-if="store.isLoggedIn"
        class="btn btn-sm btn-ghost"
        @click="store.showEditSection = section"
      >
        ✏ 编辑
      </button>
    </div>
    <div class="text-content">{{ section.content }}</div>
  </div>
</template>
