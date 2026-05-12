<template>
  <div class="tab-page">
    <Transition name="toast">
      <div v-if="showToast" class="toast-bar">
        <span class="toast-icon">✅</span>
        {{ toastMessage }}
      </div>
    </Transition>

    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <h2>{{ $t('profile_display_mode') }}</h2>
    </div>

    <!-- 显示模式 -->
    <div class="section-card">
      <div
        v-for="option in themeOptions"
        :key="option.value"
        class="select-item"
        :class="{ active: currentTheme === option.value }"
        @click="setTheme(option.value)"
      >
        <span class="select-icon">{{ option.icon }}</span>
        <div class="select-info">
          <span class="select-label">{{ $t(option.labelKey) }}</span>
          <span class="select-desc">{{ $t(option.descKey) }}</span>
        </div>
        <span v-if="currentTheme === option.value" class="select-check">✓</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ThemeSettings',
  setup() {
    const currentTheme = ref(localStorage.getItem('theme') || 'auto')
    const showToast = ref(false)
    const toastMessage = ref('')
    let toastTimer = null

    const themeOptions = [
      { value: 'light', labelKey: 'theme_light', icon: '☀️', descKey: 'theme_light_desc' },
      { value: 'dark', labelKey: 'theme_dark', icon: '🌙', descKey: 'theme_dark_desc' },
      { value: 'auto', labelKey: 'theme_auto', icon: '💻', descKey: 'theme_auto_desc' }
    ]

    const setTheme = (value) => {
      currentTheme.value = value
      localStorage.setItem('theme', value)
      if (value === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else if (value === 'light') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        localStorage.removeItem('theme')
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
      }
      toastMessage.value = '已切换'
      showToast.value = true
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => { showToast.value = false }, 2000)
    }

    const goBack = () => { window.location.href = '/home/settings' }

    return { currentTheme, themeOptions, showToast, toastMessage, setTheme, goBack }
  }
}
</script>

<style scoped>
.tab-page {
  max-width: 600px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-weight: 500;
}
.page-header h2 {
  font-size: 22px;
  color: var(--text-primary);
}
.section-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 8px 0;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.select-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-light);
}
.select-item:last-child { border-bottom: none; }
.select-item:active { background: var(--bg-hover); }
.select-item.active { background: var(--bg-primary-light); }
.select-icon { font-size: 24px; width: 36px; text-align: center; }
.select-info { flex: 1; }
.select-label { display: block; font-size: 15px; font-weight: 500; color: var(--text-primary); }
.select-desc { display: block; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.select-check { color: var(--color-primary); font-size: 18px; font-weight: bold; }
.toast-bar {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  background: var(--color-success); color: white; padding: 12px 24px;
  border-radius: 12px; font-size: 15px; font-weight: 600; z-index: 9999;
  box-shadow: 0 4px 20px rgba(52, 211, 153, 0.35);
}
</style>
