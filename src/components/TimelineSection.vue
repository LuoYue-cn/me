<script setup>
import { computed, ref, watch } from 'vue'
import { useAppStore } from '../stores/app.js'

defineProps({
  section: { type: Object, required: true },
})

const store = useAppStore()
const page = ref(1)
const touchHighlight = ref(null)

function onItemTouch(id) {
  touchHighlight.value = id
  setTimeout(() => { if (touchHighlight.value === id) touchHighlight.value = null }, 600)
}

const placeholderIcon = computed(() => store.data?.settings?.placeholderIcon || '')

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
watch(() => [store.selectedTags, store.selectedYears, store.selectedMonths], () => { page.value = 1 }, { deep: true })

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
  const label = site.type === 'post' ? (site.content?.slice(0, 20) || '这条说说') : site.name
  store.showConfirm = {
    title: '删除',
    message: `确定要删除「${label}」吗？`,
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
      <span>历程</span>
      <button
        v-if="store.isLoggedIn"
        class="btn btn-sm btn-primary"
        @click="store.showAddSite = true"
      >
        ＋ 添加
      </button>
    </div>



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
      <p>没有匹配的条目</p>
      <button class="btn btn-sm btn-ghost" @click="store.selectedTags = []; store.selectedYears = []; store.selectedMonths = []">
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
          v-memo="[site.id, store.isLoggedIn]"
          class="timeline-item"
          :class="{ 'timeline-item-touch': touchHighlight === site.id }"
          @touchstart="onItemTouch(site.id)"
        >
          <div class="timeline-date">{{ site.date?.slice(0, 10) }}</div>
          <div class="timeline-item-body">
            <!-- 说说 -->
            <template v-if="site.type === 'post'">
              <div class="timeline-icon">
                <img :src="site.icon || placeholderIcon || undefined" alt="图标" loading="lazy"
                  @error="$event.target.closest('.timeline-icon').classList.add('hidden')" />
              </div>
              <div class="timeline-info">
                <div class="timeline-post">{{ site.content }}</div>
                <div class="timeline-tags">
                  <span class="timeline-tag timeline-tag-type">{{ site.type === 'post' ? '📝 说说' : '🔗 链接' }}</span>
                  <span v-if="site.tags?.length">
                    <span v-for="(tag, i) in site.tags" :key="i" class="timeline-tag">{{ tag }}</span>
                  </span>
                  <span v-else class="timeline-tag">无特定</span>
                </div>
              </div>
            </template>

            <!-- 博客：标题+简介，点击看全文 -->
            <template v-else-if="site.type === 'blog'">
              <div class="timeline-icon">
                <img :src="site.icon || placeholderIcon || undefined" alt="图标" loading="lazy"
                  @error="$event.target.closest('.timeline-icon').classList.add('hidden')" />
              </div>
              <div class="timeline-info">
                <div class="timeline-name timeline-name-clickable" @click="store.showBlog = site.id">
                  <a>{{ site.name }}</a>
                </div>
                <div v-if="site.description" class="timeline-desc">{{ site.description }}</div>
                <div class="timeline-tags">
                  <span class="timeline-tag timeline-tag-type">{{ '📄 博客' }}</span>
                  <span v-for="(tag, i) in site.tags" :key="i" v-if="site.tags?.length" class="timeline-tag">{{ tag }}</span>
                </div>
              </div>
            </template>

            <!-- 链接：网站图标+名称+url+描述 -->
            <template v-else>
              <div class="timeline-icon">
                <img :src="site.icon || placeholderIcon || undefined" :alt="site.name + ' 图标'" loading="lazy"
                  @error="$event.target.closest('.timeline-icon').classList.add('hidden')" />
              </div>
              <div class="timeline-info">
                <div class="timeline-name">
                  <a :href="site.url" target="_blank" rel="noopener">{{ site.name }}</a>
                </div>
                <div class="timeline-url">{{ cleanUrl(site.url) }}</div>
                <div v-if="site.description" class="timeline-desc">{{ site.description }}</div>
                <div class="timeline-tags">
                  <span class="timeline-tag timeline-tag-type">{{ site.type === 'post' ? '📝 说说' : '🔗 链接' }}</span>
                  <span v-if="site.tags?.length">
                    <span v-for="(tag, i) in site.tags" :key="i" class="timeline-tag">{{ tag }}</span>
                  </span>
                  <span v-else class="timeline-tag">无特定</span>
                </div>
              </div>
            </template>
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
