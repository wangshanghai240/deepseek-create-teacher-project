import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initI18n, t, getLang, setLang } from './i18n'
import { initNetworkMonitor } from './network'

// 初始化语言
initI18n()

// 初始化网络监听
initNetworkMonitor()

// 初始化主题
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark')
} else if (savedTheme === 'light') {
  document.documentElement.removeAttribute('data-theme')
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'auto') {
      if (e.matches) {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    }
  })
}

const app = createApp(App)
app.use(router)
// 全局注入翻译函数
app.config.globalProperties.$t = t
app.config.globalProperties.$lang = { getLang, setLang }
app.mount('#app')