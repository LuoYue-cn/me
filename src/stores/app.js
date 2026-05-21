import { defineStore } from 'pinia'
import { fetchData, saveData, verifyToken, saveToken, clearToken, hasToken, workerAuth, workerSave } from '../api/github.js'
import { encodeBase64 } from '../api/github.js'

/**
 * 默认数据模板
 */
function defaultData() {
  return {
    profile: {
      name: '你的名字',
      bio: '个人简介',
      avatar: '',
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
  return `${y}-${m}-${day}`
}

function genId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

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
    selectedTag: '',
    selectedYear: '',
    selectedMonth: '',

    // 对话框
    showLogin: false,
    showEditProfile: false,
    showAddSite: false,
    showEditSite: null,    // 正在编辑的网站对象
    showEditSection: null, // 正在编辑的区块
    showConfirm: null,     // { title, message, onConfirm }
    showSettings: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user || !!state.workerToken,
    websites: (state) => state.data?.websites || [],
    profile: (state) => state.data?.profile || { name: '', bio: '', avatar: '', social: [] },
    sections: (state) => state.data?.sections || [],

    // 所有不重复的标签，按拼音排序
    allTags: (state) => {
      const set = new Set()
      for (const site of (state.data?.websites || [])) {
        for (const tag of (site.tags || [])) {
          if (tag) set.add(tag)
        }
      }
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

    // 按所有筛选条件过滤网站
    filteredWebsites: (state) => {
      let list = state.data?.websites || []
      if (state.selectedTag) {
        list = list.filter(s => s.tags && s.tags.includes(state.selectedTag))
      }
      if (state.selectedYear) {
        list = list.filter(s => s.date && s.date.startsWith(state.selectedYear))
      }
      if (state.selectedMonth) {
        list = list.filter(s => s.date && s.date.slice(5, 7) === state.selectedMonth)
      }
      return list
    },
  },

  actions: {
    setTag(tag) {
      this.selectedTag = tag
    },
    setYear(year) {
      this.selectedYear = year
      this.selectedMonth = ''
    },
    setMonth(month) {
      this.selectedMonth = month
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
        const result = await fetchData()
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
      if (!this.sha) {
        try {
          const result = await fetchData()
          this.sha = result ? result.sha : null
        } catch {
          this.sha = null
        }
      }
      this.saving = true
      try {
        const json = JSON.stringify(this.data, null, 2)
        const content = encodeBase64(json)
        // 优先走 Worker 代理（密码登录），否则直连 GitHub API
        if (this.workerToken) {
          const newSha = await workerSave(content, this.sha, this.workerToken)
          this.sha = newSha
        } else {
          const newSha = await saveData(this.data, this.sha)
          this.sha = newSha
        }
      } catch (e) {
        throw new Error('保存失败: ' + e.message)
      } finally {
        this.saving = false
      }
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
