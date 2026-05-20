import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 如果部署到 GitHub Pages 的子路径，改这里
  // 例如 https://yourname.github.io/me/ 则 base: '/me/'
  base: '/',
})
