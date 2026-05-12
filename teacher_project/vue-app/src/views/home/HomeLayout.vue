<template>
  <div class="home-layout">
    <!-- 页面内容区域 -->
    <div class="content-area">
      <router-view />
    </div>

    <!-- 底部导航栏 -->
    <div class="bottom-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: currentPath === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../../i18n'

export default {
  name: 'HomeLayout',
  setup() {
    const route = useRoute()
    const currentPath = computed(() => route.path)

    const navItems = computed(() => [
      { path: '/home/index', label: t('nav_home'), icon: '🏠' },
      { path: '/home/articles', label: t('nav_articles'), icon: '📄' },
      { path: '/home/teachers', label: t('nav_teachers'), icon: '👨‍🏫' },
      { path: '/home/profile', label: t('nav_profile'), icon: '👤' }
    ])

    return { navItems, currentPath }
  }
}
</script>

<style scoped>
.home-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.content-area {
  flex: 1;
  padding: 16px;
  padding-bottom: 80px;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: 6px 0;
  padding-bottom: env(safe-area-inset-bottom, 6px);
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 12px;
  transition: color 0.2s;
  padding: 4px 0;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 11px;
}
</style>
