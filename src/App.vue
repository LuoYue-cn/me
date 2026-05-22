<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useAppStore } from './stores/app.js'
import ProfileSection from './components/ProfileSection.vue'
import TextSection from './components/TextSection.vue'
import TimelineSection from './components/TimelineSection.vue'
import LoginDialog from './components/LoginDialog.vue'
import EditProfileDialog from './components/EditProfileDialog.vue'
import AddSiteDialog from './components/AddSiteDialog.vue'
import EditSiteDialog from './components/EditSiteDialog.vue'
import EditSectionDialog from './components/EditSectionDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import SiteSettingsDialog from './components/SiteSettingsDialog.vue'

const store = useAppStore()

const textSection = computed(() => store.sections.find(s => s.type === 'text'))
const timelineSection = computed(() => store.sections.find(s => s.type === 'timeline'))

const toastMsg = ref('')
const clockStr = ref('')

// ===== 年龄计算 =====
const BIRTH = new Date('2011-04-02')
const now = ref(new Date())
let clockTimer

function pad(n) { return String(n).padStart(2, '0') }
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function updateClock() {
  const d = new Date()
  clockStr.value =
    `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} 星期${WEEKDAYS[d.getDay()]}`
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(() => {
    updateClock()
    now.value = new Date()
  }, 1000)
})
onUnmounted(() => {
  clearInterval(clockTimer)
})

const ageInfo = computed(() => {
  const n = now.value
  const diff = n - BIRTH
  const totalDays = Math.floor(diff / 86400000)
  let years = n.getFullYear() - BIRTH.getFullYear()
  const mDiff = n.getMonth() - BIRTH.getMonth()
  if (mDiff < 0 || (mDiff === 0 && n.getDate() < BIRTH.getDate())) years--
  // 距离下次生日天数
  const nextBD = new Date(n.getFullYear(), BIRTH.getMonth(), BIRTH.getDate())
  if (nextBD < n) nextBD.setFullYear(nextBD.getFullYear() + 1)
  const daysToNext = Math.ceil((nextBD - n) / 86400000)
  return { years, totalDays, daysToNext }
})

const bgClass = computed(() => {
  const s = store.data?.settings
  if (!s) return 'bg-preset-ocean'
  if (s.bgType === 'custom') {
    const hasUrl = s.bgCustom || (s.bgCustomUrls && s.bgCustomUrls.length)
    if (hasUrl) return ''
  }
  return 'bg-preset-' + s.bgPreset
})

// 自动登录 & 加载数据
onMounted(async () => {
  // 检查 URL hash 中是否有 OAuth token
  if (location.hash.startsWith('#token=')) {
    const token = location.hash.slice(7)
    location.hash = ''
    try { await store.login(token) } catch {}
  }

  await store.checkLogin()
  await store.loadData()

  // 设置页面标题
  if (store.data?.profile?.name) {
    document.title = store.data.profile.name
  }

  // 应用设置
  const s = store.data?.settings
  if (s) {
    document.documentElement.setAttribute('data-theme', s.theme || 'smooth')
    document.documentElement.style.setProperty('--bg-blur', s.bgBlur + 'px')
    document.documentElement.style.setProperty('--card-blur', (s.cardBlur ?? 10) + 'px')
    document.documentElement.style.setProperty('--card-bg-alpha', s.cardOpacity)
    const setFavicon = (url) => {
      let link = document.querySelector('link[rel="icon"]')
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; link.type = 'image/svg+xml'; document.head.appendChild(link) }
      link.href = url || '/favicon.svg'
    }
    setFavicon(s.siteIcon)
    if (s.bgType === 'custom') {
      const urls = s.bgCustomUrls || []
      const active = urls[s.bgCustomActive]
      const activeUrl = active ? (active.url || active) : s.bgCustom
      if (activeUrl) {
        const bg = document.getElementById('app-bg')
        if (bg) bg.style.backgroundImage = `url(${activeUrl})`
      }
    }
  }
})

function toast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}
</script>

<template>
  <!-- 背景层 -->
  <div id="app-bg" class="app-bg" :class="bgClass"></div>
  <div class="app-bg-overlay"></div>



  <div class="container" style="position:relative;z-index:1">
    <!-- 顶部栏（时钟 + 登录） -->
    <div class="topbar">
      <div class="topbar-clock">
        <img v-if="store.data?.settings?.siteIcon" :src="store.data.settings.siteIcon" class="topbar-icon" alt="" loading="lazy" decoding="async" />
        {{ clockStr }}
      </div>
      <div class="topbar-right">
        <template v-if="store.loggingIn">
          <span class="user-badge">验证中...</span>
        </template>
        <template v-else-if="store.isLoggedIn">
          <span class="user-badge">👤 {{ store.user }}</span>
          <button class="btn btn-sm" @click="store.showSettings = true">🎨 设置</button>
          <button class="btn btn-sm" @click="store.logout()">退出</button>
        </template>
        <template v-else>
          <button class="btn btn-sm" @click="store.showLogin = true">🔑 管理登录</button>
        </template>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="store.loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="store.error" class="error-banner">
      <span>{{ store.error }}</span>
      <button class="btn btn-sm btn-ghost" @click="store.loadData()">重试</button>
    </div>

    <!-- 正常内容 -->
    <template v-else-if="store.data">
      <div class="main-layout">
        <!-- 左侧列 -->
        <div class="layout-left-col">
          <!-- ① 个人信息 -->
          <div class="layout-profile"><ProfileSection /></div>

          <!-- ② 关于我（文字区块） -->
          <div class="layout-about" v-if="textSection">
            <TextSection :section="textSection" />
          </div>

          <!-- ③ 年龄计数器 -->
          <div class="section-card age-counter">
            <div class="age-number">{{ ageInfo.years }}<span style="font-size:18px;font-weight:400"> 岁</span></div>
            <div class="age-label">已来到人间</div>
            <div class="age-days">{{ ageInfo.totalDays.toLocaleString() }} 天</div>
            <div v-if="ageInfo.daysToNext <= 365" class="age-detail">距 {{ ageInfo.years + 1 }} 岁生日还有 {{ ageInfo.daysToNext }} 天</div>
          </div>

          <!-- ④ 筛选：年 / 月 / 标签 -->
          <div class="section-card tag-filter">
            <div style="font-size:14px;font-weight:600;margin-bottom:10px">筛选</div>

            <!-- 年份 -->
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">年份</div>
            <div class="tag-filter-list" style="margin-bottom:8px">
              <span class="tag-filter-item" :class="{ active: !store.selectedYear }"
                @click="store.setYear('')">全部</span>
              <span v-for="y in store.allYears" :key="y" class="tag-filter-item"
                :class="{ active: store.selectedYear === y }"
                @click="store.setYear(y)">{{ y }}</span>
            </div>

            <!-- 月份（只当选中某年时显示） -->
            <template v-if="store.selectedYear">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">月份</div>
              <div class="tag-filter-list" style="margin-bottom:8px">
                <span class="tag-filter-item" :class="{ active: !store.selectedMonth }"
                  @click="store.setMonth('')">全部</span>
                <span v-for="m in 12" :key="m" class="tag-filter-item"
                  :class="{ active: store.selectedMonth === String(m).padStart(2,'0') }"
                  @click="store.setMonth(String(m).padStart(2,'0'))">{{ m }}</span>
              </div>
            </template>

            <!-- 标签 -->
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">标签</div>
            <div class="tag-filter-list">
              <span class="tag-filter-item" :class="{ active: !store.selectedTag }"
                @click="store.setTag('')">全部</span>
              <span v-for="tag in store.allTags" :key="tag" class="tag-filter-item"
                :class="{ active: store.selectedTag === tag }"
                @click="store.setTag(tag)">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧列：网站时间轴 -->
        <div class="layout-right-col" v-if="timelineSection">
          <div class="layout-timeline">
            <TimelineSection :section="timelineSection" />
          </div>
        </div>
      </div>

      <!-- 页脚 -->
      <div class="footer">
        © {{ new Date().getFullYear() }} {{ store.profile.name || '我的主页' }}
      </div>
    </template>

    <!-- 空数据 -->
    <div v-else class="empty-state">
      <p>暂无数据，请检查 GitHub 仓库配置</p>
    </div>
  </div>

  <!-- 对话框们 -->
  <LoginDialog v-if="store.showLogin" />
  <EditProfileDialog v-if="store.showEditProfile" />
  <AddSiteDialog v-if="store.showAddSite" />
  <EditSiteDialog v-if="store.showEditSite" :site="store.showEditSite" />
  <EditSectionDialog v-if="store.showEditSection" :section="store.showEditSection" />
  <ConfirmDialog v-if="store.showConfirm" :confirm="store.showConfirm" />
  <SiteSettingsDialog v-if="store.showSettings" />

  <!-- Toast -->
  <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
</template>
