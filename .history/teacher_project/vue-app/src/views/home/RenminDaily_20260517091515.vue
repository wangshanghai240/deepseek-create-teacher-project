<template>
  <div class="renmin-daily">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">⏳ {{ $t('loading') }}</div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchArticles">🔄 重试</button>
    </div>

    <!-- 文章列表 -->
    <div v-else class="article-list">
      <div
        v-for="(item, index) in articles"
        :key="index"
        class="article-card"
        @click="openArticle(item)"
      >
        <!-- 图片 -->
        <div v-if="item.image" class="article-image">
          <img :src="item.image" :alt="item.title" loading="lazy" />
        </div>
        <h3 class="article-title">{{ item.title }}</h3>
        <p v-if="item.summary" class="article-summary">{{ item.summary }}</p>
        <div class="article-meta">
          <span class="article-source">📰 {{ item.source || '人民日报' }}</span>
          <span class="article-time">🕐 {{ formatTime(item.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'RenminDaily',
  setup() {
    const articles = ref([])
    const loading = ref(true)
    const error = ref('')

    // 从后端代理获取人民日报文章
    const fetchArticles = async () => {
      loading.value = true
      error.value = ''
      try {
        const res = await fetch('/api/renmin?page=1&pageSize=20', { timeout: 15000 })
        const result = await res.json()
        if (result.success && Array.isArray(result.data)) {
          articles.value = result.data
        } else {
          throw new Error(result.message || '获取失败')
        }
      } catch (err) {
        console.error('人民日报获取失败:', err)
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          error.value = '无法连接服务器，请确保后端已启动'
        } else {
          error.value = '获取人民日报文章失败，请稍后重试'
        }
      } finally {
        loading.value = false
      }
    }

    const openArticle = (item) => {
      // 直接在新窗口打开 peopleapp.com 搜索页面
      // peopleapp.com 是 SPA，文章详情由 JS 动态渲染
      window.open(item.url, '_blank')
    }

    const formatTime = (time) => {
      if (!time) return ''
      const d = new Date(time)
      if (isNaN(d.getTime())) return time
      const now = new Date()
      const diff = now - d
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
      if (diff < 172800000) return '昨天'
      return `${d.getMonth() + 1}/${d.getDate()}`
    }

    onMounted(fetchArticles)

    return { articles, loading, error, openArticle, formatTime, fetchArticles }
  }
}
</script>

<style scoped>
.renmin-daily {
  min-height: 200px;
}

.loading-state {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
}

.error-state {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.error-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.error-state p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
}

.retry-btn {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.retry-btn:hover {
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.4);
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.article-image {
  margin: -16px -18px 12px;
  border-radius: 14px 14px 0 0;
  overflow: hidden;
  max-height: 200px;
}

.article-image img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.article-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.article-source {
  flex: 1;
}

.article-time {
  font-size: 12px;
}
</style>
