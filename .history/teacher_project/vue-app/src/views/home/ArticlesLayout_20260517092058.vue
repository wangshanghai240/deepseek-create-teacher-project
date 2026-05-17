<template>
  <div class="articles-layout">
    <!-- Tab 切换栏 -->
    <div class="tab-bar">
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
      <ArticlesPage v-if="activeTab === 'articles'" />
      <RenminDaily v-if="activeTab === 'renmin'" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
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

    const switchTab = (tab) => {
      activeTab.value = tab
      // 清除 query 参数
      router.replace({ query: {} })
    }

    onMounted(() => {
      // 如果 URL 中有 tab=renmin 参数，自动切换到人民日报 Tab
      if (route.query.tab === 'renmin') {
        activeTab.value = 'renmin'
      }
    })

    return { activeTab, switchTab }
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
