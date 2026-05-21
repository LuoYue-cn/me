<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const visibleSocials = computed(() =>
  (store.profile.social || []).filter(s => s.show !== false)
)
</script>

<template>
  <div class="section-card profile">
    <!-- 头像 -->
    <img
      v-if="store.profile.avatar"
      :src="store.profile.avatar"
      :alt="store.profile.name"
      class="profile-avatar"
    />
    <div v-else class="profile-avatar" style="background:var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:36px;color:var(--text-muted)">
      ?
    </div>

    <!-- 名字 -->
    <h1 class="profile-name">{{ store.profile.name }}</h1>
    <p class="profile-bio">{{ store.profile.bio }}</p>

    <!-- 技能进度条 -->
    <div v-if="store.profile.skills?.length" class="skill-bars">
      <div v-for="(sk, i) in store.profile.skills" :key="i" class="skill-bar-row">
        <span class="skill-bar-label">{{ sk.name }}</span>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" :style="{ width: Math.min(sk.level, 100) + '%' }"></div>
        </div>
        <span class="skill-bar-pct">{{ sk.level }}%</span>
      </div>
    </div>

    <!-- 社交链接（只显示已开启的） -->
    <div v-if="visibleSocials.length" class="profile-social">
      <a
        v-for="(s, i) in visibleSocials"
        :key="i"
        :href="s.url"
        target="_blank"
        rel="noopener"
        class="profile-social-item"
      >
        {{ s.platform }}
      </a>
    </div>

    <!-- 管理员：编辑按钮 -->
    <div v-if="store.isLoggedIn" class="admin-bar">
      <button class="btn btn-sm" @click="store.showEditProfile = true">
        ✏ 编辑个人信息
      </button>
    </div>
  </div>
</template>
