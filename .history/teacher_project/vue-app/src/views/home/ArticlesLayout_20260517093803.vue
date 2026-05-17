<template>
  <div class="articles-layout">
    <!-- Tab 切换栏 -->
    <div class="tab-bar">
      <div class="tab-indicator" :style="indicatorStyle"></div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'articles' }"
        @click="switchTab('articles')"
      >
        📄 {{ $t('articles_tab_articles') }}
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'renmin' }"
        @click="switchTab('renmin')"
      >
        📰 {{ $t('articles_tab_renmin') }}
      </div>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <Transition :name="transitionName" mode="out-in">
        <div :key="activeTab" class="tab-panel">
          <ArticlesPage v-if="activeTab === 'articles'" />
          <RenminDaily v-if="activeTab === 'renmin'" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticlesPage from './ArticlesPage.vue'
import RenminDaily from './RenminDaily.vue'

export default {
  name: 'ArticlesLayout',
  components: { ArticlesPage, RenminDaily },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const activeTab = ref('articles')
    const transitionName = ref('tab-fade')

    // 滑动指示器位置
    const indicatorStyle = computed(() => ({
      transform: `translateX(${activeTab.value === 'articles' ? '0' : '100'}%)`
    }))

    const switchTab = (tab) => {
      if (tab === activeTab.value) return
      // 左右滑动方向
      transitionName.value = tab === 'articles' ? 'tab-slide-right' : 'tab-slide-left'
      activeTab.value = tab
      router.replace({ query: {} })
    }

    onMounted(() => {
      if (route.query.tab === 'renmin') {
        activeTab.value = 'renmin'
      }
    })

    return { activeTab, transitionName, indicatorStyle, switchTab }
  }
}
</script>

<style scoped>
.articles-layout {
  max-width: 600px;
  margin: 0 auto;
}

.tab-bar {
  display: flex;
  position: relative;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
  overflow: hidden;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: var(--color-primary-gradient);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(129, 140, 248, 0.3);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.3s ease;
  user-select: none;
  z-index: 1;
  position: relative;
}

.tab-item.active {
  color: white;
}

.tab-item:not(.active):hover {
  color: var(--text-primary);
}

.tab-content {
  min-height: 300px;
  overflow: hidden;
}

.tab-panel {
  width: 100%;
}

/* 滑动切换动画 */
.tab-slide-left-enter-active,
.tab-slide-left-leave-active,
.tab-slide-right-enter-active,
.tab-slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-slide-left-enter-from {
  transform: translateX(60px);
  opacity: 0;
}

.tab-slide-left-leave-to {
  transform: translateX(-60px);
  opacity: 0;
}

.tab-slide-right-enter-from {
  transform: translateX(-60px);
  opacity: 0;
}

.tab-slide-right-leave-to {
  transform: translateX(60px);
  opacity: 0;
}

/* 淡入淡出备用动画 */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: all 0.25s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
