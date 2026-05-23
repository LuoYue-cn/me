import { defineStore } from 'pinia'
import { fetchData, saveData, verifyToken, saveToken, clearToken, hasToken, workerAuth, workerSave, encodeBase64 } from '../api/github.js'


/**
 * 默认数据模板
 */
function defaultData() {
  return {
    profile: {
      name: '你的名字',
      bio: '个人简介',
      avatar: '',
      skills: [],
      social: [
        { platform: 'GitHub', url: 'https://github.com/LuoYue-cn', icon: 'github', show: true },
      ],
    },
    settings: {
      bgType: 'preset',
      bgPreset: 'ocean',
      bgCustom: '',
      bgCustomUrls: [],
      bgCustomActive: 0,
      bgBlur: 10,
      cardOpacity: 0.78,
      cardBlur: 10,
      theme: 'smooth',
      pagination: { enabled: false, perPage: 10 },
      siteIcon: '',
      placeholderIcon: '',
    },
    sections: [
      { id: 'about', type: 'text', title: '关于我', content: '写点什么介绍一下自己吧。', order: 0 },
      { id: 'websites', type: 'timeline', title: '我的网站', content: '我做过的一些项目', order: 1 },
    ],
    websites: [
      {
        id: 'demo-1',
        type: 'link',
        name: '示例网站',
        url: 'https://example.com',
        description: '这是我的第一个项目',
        date: formatDate(new Date()),
        icon: '',
        tags: ['项目'],
      },
    ],
  }
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

function genId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

let saveQueue = Promise.resolve()

export const useAppStore = defineStore('app', {
  state: () => ({
    // 登录状态
    user: null,            // GitHub 用户名（登录后）
    loggingIn: false,      // 正在验证 token

    // Worker 密码登录
    workerToken: localStorage.getItem('worker_token') || null,

    // 数据
    data: null,
    sha: null,
    loading: false,
    saving: false,
    error: null,

    // 筛选
    searchQuery: '',
    selectedTags: [],
    selectedYears: [],
    selectedMonths: [],

    // 对话框
    showLogin: false,
    showEditProfile: false,
    showAddSite: false,
    showEditSite: null,    // 正在编辑的网站对象
    showEditSection: null, // 正在编辑的区块
    showConfirm: null,     // { title, message, onConfirm }
    showSettings: false,
    showBlog: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user || !!state.workerToken,
    websites: (state) => state.data?.websites || [],
    profile: (state) => state.data?.profile || { name: '', bio: '', avatar: '', social: [] },
    sections: (state) => state.data?.sections || [],

    // 所有不重复的标签，按拼音排序（含虚拟类型标签）
    allTags: (state) => {
      const set = new Set()
      let hasUntagged = false
      for (const site of (state.data?.websites || [])) {
        if (site.type === 'post') set.add('📝 说说')
        else if (site.type === 'blog') set.add('📄 博客')
        else set.add('🔗 链接')
        if (site.tags && site.tags.length) {
          site.tags.forEach(t => { if (t) set.add(t) })
        } else {
          hasUntagged = true
        }
      }
      if (hasUntagged) set.add('无特定')
      return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    },

    // 可用的年份（有网站的年份，降序）
    allYears: (state) => {
      const set = new Set()
      for (const site of (state.data?.websites || [])) {
        if (site.date) set.add(site.date.slice(0, 4))
      }
      return [...set].sort((a, b) => b.localeCompare(a))
    },

    // 按所有筛选条件过滤网站（多标签 OR 逻辑）
    filteredWebsites: (state) => {
      let list = state.data?.websites || []
      if (state.selectedTags.length) {
        const typeTags = state.selectedTags.filter(t => ['🔗 链接', '📝 说说', '📄 博客'].includes(t))
        const otherTags = state.selectedTags.filter(t => !['🔗 链接', '📝 说说', '📄 博客'].includes(t))
        list = list.filter(s => {
          if (typeTags.length && !typeTags.some(t => {
            if (t === '🔗 链接') return s.type === 'link'
            if (t === '📝 说说') return s.type === 'post'
            if (t === '📄 博客') return s.type === 'blog'
          })) return false
          if (otherTags.length && !otherTags.every(t => {
            if (t === '无特定') return !s.tags || !s.tags.length
            return s.tags && s.tags.includes(t)
          })) return false
          return true
        })
      }
      if (state.selectedYears.length) {
        list = list.filter(s => s.date && state.selectedYears.some(y => s.date.startsWith(y)))
      }
      if (state.selectedMonths.length) {
        list = list.filter(s => s.date && state.selectedMonths.some(m => s.date.slice(5, 7) === m))
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase()
        list = list.filter(s =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.content && s.content.toLowerCase().includes(q)) ||
          (s.url && s.url.toLowerCase().includes(q)) ||
          (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
        )
      }
      return list
    },
  },

  actions: {
    toggleTag(tag) {
      if (this.selectedTags.includes(tag)) {
        this.selectedTags = this.selectedTags.filter(t => t !== tag)
      } else {
        this.selectedTags = [...this.selectedTags, tag]
      }
    },
    toggleYear(year) {
      if (this.selectedYears.includes(year)) {
        this.selectedYears = this.selectedYears.filter(y => y !== year)
      } else {
        this.selectedYears = [...this.selectedYears, year]
      }
      this.selectedMonth = ''
    },
    toggleMonth(month) {
      if (this.selectedMonths.includes(month)) {
        this.selectedMonths = this.selectedMonths.filter(m => m !== month)
      } else {
        this.selectedMonths = [...this.selectedMonths, month]
      }
    },

    /**
     * 检查是否有已保存的 token，自动登录
     */
    async checkLogin() {
      if (!hasToken()) return false
      this.loggingIn = true
      try {
        const token = localStorage.getItem('github_token')
        const username = await verifyToken(token)
        if (username) {
          this.user = username
          return true
        }
        clearToken()
        return false
      } catch {
        clearToken()
        return false
      } finally {
        this.loggingIn = false
      }
    },

    /**
     * 用 token 登录
     */
    async login(token) {
      this.loggingIn = true
      try {
        const username = await verifyToken(token)
        if (!username) throw new Error('Token 无效，请检查')
        saveToken(token)
        this.user = username
        this.showLogin = false
      } finally {
        this.loggingIn = false
      }
    },

    async loginWithPassword(password) {
      const token = await workerAuth(password)
      localStorage.setItem('worker_token', token)
      this.workerToken = token
      this.user = 'admin'
    },

    logout() {
      clearToken()
      localStorage.removeItem('worker_token')
      this.workerToken = null
      this.user = null
    },

    /**
     * 从 GitHub 加载数据
     */
    async loadData() {
      this.loading = true
      this.error = null
      try {
        const result = await fetchData(!!this.workerToken)
        if (result) {
          this.data = result.content
          this.sha = result.sha
        } else {
          // 没有数据文件，用默认数据
          this.data = defaultData()
          this.sha = null
        }
      } catch (e) {
        this.error = '加载数据失败: ' + e.message
        // 降级：用默认数据
        if (!this.data) {
          this.data = defaultData()
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * 保存数据到 GitHub
     */
    async save() {
      // 排队：保证同一时间只有一个保存操作
      const task = async () => {
        this.saving = true
        try {
          if (!this.sha) {
            try {
              const result = await fetchData(!!this.workerToken)
              this.sha = result ? result.sha : localStorage.getItem('last_sha') || null
            } catch {
              this.sha = localStorage.getItem('last_sha') || null
            }
          }

          const json = JSON.stringify(this.data, null, 2)
          const content = encodeBase64(json)

          if (this.workerToken) {
            this.sha = await workerSave(content, this.sha, this.workerToken)
          } else {
            this.sha = await saveData(this.data, this.sha)
          }
          localStorage.setItem('last_sha', this.sha)
        } catch (e) {
          throw new Error('保存失败: ' + e.message)
        } finally {
          this.saving = false
        }
      }
      saveQueue = saveQueue.then(task, task)
      return saveQueue
    },

    // ============ 网站操作 ============

    addWebsite(site) {
      const entry = {
        id: genId(),
        type: site.type || 'link',
        date: site.date || formatDate(new Date()),
        tags: site.tags || [],
      }
      if (entry.type === 'post') {
        entry.content = site.content || ''
        entry.icon = site.icon || ''
        if (site.attachments) entry.attachments = site.attachments
      } else if (entry.type === 'blog') {
        entry.name = site.name || ''
        entry.description = site.description || ''
        entry.content = site.content || ''
        entry.icon = site.icon || ''
        if (site.attachments) entry.attachments = site.attachments
      } else {
        entry.name = site.name || ''
        entry.url = site.url || ''
        entry.description = site.description || ''
        entry.icon = site.icon || ''
      }
      this.data.websites.push(entry)
    },

    updateWebsite(id, updates) {
      const idx = this.data.websites.findIndex(s => s.id === id)
      if (idx !== -1) {
        const entry = this.data.websites[idx]
        if (updates.type === 'post') {
          // 切到 post：清除 link 字段
          Object.assign(entry, updates)
          entry.name = ''; entry.url = ''; entry.description = ''; entry.icon = ''
        } else if (entry.type === 'post' && updates.type !== 'post') {
          // 从 post 切回 link：清除 content
          entry.content = ''
          Object.assign(entry, updates)
        } else {
          Object.assign(entry, updates)
        }
      }
    },

    removeWebsite(id) {
      this.data.websites = this.data.websites.filter(s => s.id !== id)
    },

    // ============ 个人信息操作 ============

    updateProfile(profile) {
      Object.assign(this.data.profile, profile)
    },

    // ============ 网站设置操作 ============

    updateSettings(settings) {
      if (!this.data.settings) this.data.settings = {}
      Object.assign(this.data.settings, settings)
    },

    // ============ 区块操作 ============

    updateSection(id, updates) {
      const idx = this.data.sections.findIndex(s => s.id === id)
      if (idx !== -1) {
        Object.assign(this.data.sections[idx], updates)
      }
    },
  },
})
