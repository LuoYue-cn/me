<script setup>
import { computed, ref, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

defineProps({
  section: { type: Object, required: true },
})

const store = useAppStore()
const page = ref(1)

const pag = computed(() => store.data?.settings?.pagination || { enabled: false, perPage: 10 })

// 过滤后的网站，按日期降序平铺
const flatSorted = computed(() => {
  return [...store.filteredWebsites].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const totalPages = computed(() => {
  if (!pag.value.enabled) return 1
  return Math.max(1, Math.ceil(flatSorted.value.length / pag.value.perPage))
})

// 当前页的网站（翻页模式）或全部（非翻页模式）
const pageSites = computed(() => {
  if (!pag.value.enabled) return flatSorted.value
  const start = (page.value - 1) * pag.value.perPage
  return flatSorted.value.slice(start, start + pag.value.perPage)
})

// 翻页开关或每页条数变化时重置到第一页
watch(() => [pag.value.enabled, pag.value.perPage], () => { page.value = 1 })

// 筛选变化时重置到第一页
watch(() => [store.selectedTag, store.selectedYear, store.selectedMonth], () => { page.value = 1 })

// 按年份分组
const grouped = computed(() => {
  const map = {}
  for (const site of pageSites.value) {
    const year = site.date ? site.date.slice(0, 4) : '未知'
    if (!map[year]) map[year] = []
    map[year].push(site)
  }
  for (const year of Object.keys(map)) {
    map[year].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }
  const years = Object.keys(map).sort((a, b) => b.localeCompare(a))
  return years.map(y => ({ year: y, sites: map[y] }))
})

function cleanUrl(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

function confirmDelete(site) {
  store.showConfirm = {
    title: '删除网站',
    message: `确定要删除「${site.name}」吗？`,
    onConfirm: () => {
      store.removeWebsite(site.id)
      store.save().catch(e => console.error(e))
      store.showConfirm = null
    },
  }
}
</script>

<template>
  <div class="section-card">
    <div class="section-title">
      <span>{{ section.title }}</span>
      <button
        v-if="store.isLoggedIn"
        class="btn btn-sm btn-primary"
        @click="store.showAddSite = true"
      >
        ＋ 添加网站
      </button>
    </div>

    <!-- 区块描述 -->
    <p v-if="section.content" class="timeline-desc" style="margin-bottom:16px">
      {{ section.content }}
    </p>

    <!-- 空状态：没有任何网站 -->
    <div v-if="!store.websites.length" class="empty-state">
      <p>还没有添加网站</p>
      <button
        v-if="store.isLoggedIn"
        class="btn btn-sm btn-primary"
        style="margin-top:8px"
        @click="store.showAddSite = true"
      >
        添加第一个网站
      </button>
    </div>

    <!-- 空状态：有网站但筛选后没有匹配 -->
    <div v-else-if="!store.filteredWebsites.length" class="empty-state">
      <p>没有匹配「{{ store.selectedTag }}」的网站</p>
      <button class="btn btn-sm btn-ghost" @click="store.setTag('')">
        显示全部
      </button>
    </div>

    <!-- 时间轴 -->
    <div v-else class="timeline">
      <template v-for="group in grouped" :key="group.year">
        <div class="timeline-year">{{ group.year }}</div>
        <div
          v-for="site in group.sites"
          :key="site.id"
          class="timeline-item"
        >
          <div class="timeline-date">{{ site.date }}</div>
          <div class="timeline-item-body">
            <!-- 网站图标 -->
            <div v-if="site.icon" class="timeline-icon">
              <img
                :src="site.icon"
                :alt="site.name + ' 图标'"
                loading="lazy"
                @error="$event.target.closest('.timeline-icon').classList.add('hidden')"
              />
            </div>
            <div v-else class="timeline-icon-placeholder"></div>

            <!-- 网站信息 -->
            <div class="timeline-info">
              <div class="timeline-name">
                <a :href="site.url" target="_blank" rel="noopener">
                  {{ site.name }}
                </a>
              </div>
              <div class="timeline-url">{{ cleanUrl(site.url) }}</div>
              <div v-if="site.description" class="timeline-desc">
                {{ site.description }}
              </div>
              <div v-if="site.tags && site.tags.length" class="timeline-tags">
                <span v-for="(tag, i) in site.tags" :key="i" class="timeline-tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- 管理员操作按钮 -->
          <div v-if="store.isLoggedIn" class="timeline-actions">
            <button
              class="btn btn-sm btn-ghost"
              @click="store.showEditSite = site"
            >
              ✏
            </button>
            <button
              class="btn btn-sm btn-ghost"
              style="color:var(--danger)"
              @click="confirmDelete(site)"
            >
              ✕
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 翻页 -->
    <div class="pagination" v-if="pag.enabled && totalPages > 1">
      <button class="btn btn-sm" :disabled="page <= 1" @click="page--">‹</button>
      <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-sm" :disabled="page >= totalPages" @click="page++">›</button>
    </div>

    <!-- 保存/编辑提示（管理员时显示） -->
    <div v-if="store.isLoggedIn && store.websites.length" class="admin-bar">
      <button
        class="btn btn-primary"
        :disabled="store.saving"
        @click="store.save().catch(e => console.error(e))"
      >
        {{ store.saving ? '保存中...' : '💾 保存到 GitHub' }}
      </button>
    </div>
  </div>
</template>
