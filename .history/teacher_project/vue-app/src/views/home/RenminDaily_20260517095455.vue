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
        <div v-if="item.image" class="article-image">
          <img :src="item.image" :alt="item.title" loading="lazy" />
        </div>
        <div class="article-card-body">
          <h3 class="article-title">{{ item.title }}</h3>
          <p v-if="item.summary" class="article-summary">{{ item.summary }}</p>
          <div class="article-meta">
            <span class="article-source">📰 {{ item.source || '人民日报' }}</span>
            <span class="article-time">🕐 {{ formatTime(item.time) }}</span>
            <span v-if="item.hasVideo" class="video-badge">🎬 视频</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多按钮 -->
    <div v-if="!loading && !loadingMore && articles.length > 0" class="load-more">
      <button class="load-more-btn" @click="loadMore" :disabled="loadingMore">
        {{ loadingMore ? '加载中...' : '加载更多文章' }}
      </button>
    </div>
    <div v-if="loadingMore" class="loading-state" style="padding:20px">⏳ 加载中...</div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'RenminDaily',
  setup() {
    const router = useRouter()
    const articles = ref([])
    const loading = ref(true)
    const loadingMore = ref(false)
    const error = ref('')
    const loadedPage = ref(1)

    const fetchArticles = async () => {
      loading.value = true
      error.value = ''
      try {
        const res = await fetch('/api/renmin?page=1&pageSize=30', { timeout: 15000 })
        const result = await res.json()
        if (result.success && Array.isArray(result.data)) {
          articles.value = result.data
        } else {
          throw new Error(result.message || '获取失败')
        }
      } catch (err) {
        console.error('人民日报获取失败:', err)
        error.value = '获取人民日报文章失败，请稍后重试'
      } finally {
        loading.value = false
      }
    }

    const loadMore = async () => {
      loadingMore.value = true
      try {
        const nextPage = loadedPage.value + 1
        const res = await fetch('/api/renmin/more?page=' + nextPage, { timeout: 15000 })
        const result = await res.json()
        if (result.success && Array.isArray(result.data)) {
          if (result.data.length > 0) {
            // 去重后追加
            const existingUrls = new Set(articles.value.map(a => a.url))
            const newArticles = result.data.filter(a => !existingUrls.has(a.url) && a.title.length > 5)
            articles.value = [...articles.value, ...newArticles]
            loadedPage.value = nextPage
          }
        }
      } catch (err) {
        console.error('加载更多失败:', err)
      } finally {
        loadingMore.value = false
      }
    }

    const openArticle = (item) => {
      // 所有文章都有真实 /article/ URL，进入详情页
      sessionStorage.setItem('renmin_article', JSON.stringify(item))
      router.push('/home/articles/renmin-detail')
    }

    const formatTime = (time) => {
      if (!time) return ''
      // 处理 "2026-05-17 08:59:28" 格式
      let d
      if (typeof time === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(time)) {
        d = new Date(time.replace(' ', 'T'))
      } else {
        d = new Date(time)
      }
      if (isNaN(d.getTime())) return time
      const now = new Date()
      const diff = now - d
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
      if (diff < 172800000) return '昨天'
      // 今年内显示月/日，否则显示年/月/日
      if (d.getFullYear() === now.getFullYear()) {
        return `${d.getMonth() + 1}/${d.getDate()}`
      }
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
    }

    onMounted(fetchArticles)

    return { articles, loading, loadingMore, error, hasArticleUrl, openArticle, formatTime, fetchArticles, loadMore }
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
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.article-card-body {
  padding: 16px 18px;
}

.article-image {
  max-height: 200px;
  overflow: hidden;
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

.detail-badge {
  background: var(--color-primary-gradient);
  color: white;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.external-badge {
  background: var(--bg-hover);
  color: var(--text-secondary);
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

.load-more-btn {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1.5px solid var(--border-color);
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 280px;
}

.load-more-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
