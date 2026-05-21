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

    <!-- 技能进度条 -->
    <div v-if="store.profile.skills?.length" class="skill-bars" style="margin-top:16px">
      <div v-for="(sk, i) in store.profile.skills" :key="i" class="skill-bar-row">
        <span class="skill-bar-label">{{ sk.name }}</span>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" :style="{ width: Math.min(sk.level, 100) + '%' }"></div>
        </div>
        <span class="skill-bar-pct">{{ sk.level }}%</span>
      </div>
    </div>
  </div>
</template>
