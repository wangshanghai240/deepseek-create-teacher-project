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
  background: var(--bg-card);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
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
  transition: all 0.25s ease;
  user-select: none;
}

.tab-item.active {
  background: var(--color-primary-gradient);
  color: white;
  box-shadow: 0 2px 8px rgba(129, 140, 248, 0.3);
}

.tab-item:not(.active):hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-content {
  min-height: 300px;
}
</style>
