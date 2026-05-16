<template>
  <div class="news-section">
    <div class="news-header">
      <h3>📰 {{ $t('news_title') }}</h3>
      <span class="news-source">news.cctv.com</span>
    </div>

    <div v-if="loading" class="news-loading">{{ $t('loading') }}</div>

    <div v-else-if="error" class="news-error">{{ error }}</div>

    <div v-else class="news-list">
      <div
        class="news-card"
        :class="item.type"
        v-for="item in newsList"
        :key="item.id"
        @click="openNews(item)"
      >
        <div class="news-card-body">
          <div class="news-card-title">
            {{ item.title }}
            <span class="news-type-tag" :class="item.type || 'article'">
              {{ (item.type || 'article') === 'video' ? '视频' : '文章' }}
            </span>
          </div>
          <div class="news-card-summary">{{ item.summary }}</div>
          <div class="news-card-footer">
            <span class="news-reporter" v-if="item.reporter">📝 {{ item.reporter }}</span>
            <span class="news-time">{{ formatTime(item.created_at) }}</span>
          </div>
        </div>
        <div class="news-card-image" v-if="item.image_url">
          <img :src="item.image_url" :alt="item.title" />
        </div>
      </div>

      <!-- 加载更多按钮 -->
      <div v-if="hasMore" class="load-more-wrapper">
        <button class="load-more-btn" @click="loadMore" :disabled="loadingMore">
          {{ loadingMore ? $t('loading') : '加载更多新闻' }}
        </button>
      </div>
      <div v-else-if="newsList.length > 0" class="load-end-text">
        — 已加载全部新闻 —
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'NewsCard',
  setup() {
    const newsList = ref([])
    const loading = ref(true)
    const loadingMore = ref(false)
    const error = ref('')
    const page = ref(1)
    const hasMore = ref(true)
    const PAGE_SIZE = 10
    const CACHE_KEY = 'news_cache'

    const fetchNews = async (forceRefresh = false) => {
      // 尝试从缓存恢复
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          try {
            const data = JSON.parse(cached)
            newsList.value = data.list
            page.value = data.page
            hasMore.value = data.hasMore
            loading.value = false
            return
          } catch (e) { /* 缓存解析失败，重新加载 */ }
        }
      }

      loading.value = true
      error.value = ''
      page.value = 1
      try {
        const res = await axios.get(`/api/news?limit=${PAGE_SIZE}&page=1`, { timeout: 10000 })
        if (res.data.success) {
          newsList.value = res.data.data.list
          hasMore.value = res.data.data.pagination.page < res.data.data.pagination.totalPages
          // 保存到缓存
          saveCache(res.data.data.list, 1, hasMore.value)
        } else {
          error.value = '获取新闻失败'
        }
      } catch (err) {
        console.error('获取新闻失败:', err)
        error.value = '获取新闻失败，请检查网络连接'
      } finally {
        loading.value = false
      }
    }

    const saveCache = (list, currentPage, more) => {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          list,
          page: currentPage,
          hasMore: more
        }))
      } catch (e) { /* 存储失败忽略 */ }
    }

    const loadMore = async () => {
      loadingMore.value = true
      const nextPage = page.value + 1
      try {
        const res = await axios.get(`/api/news?limit=${PAGE_SIZE}&page=${nextPage}`, { timeout: 10000 })
        if (res.data.success) {
          const newItems = res.data.data.list
          const merged = [...newsList.value, ...newItems]
          newsList.value = merged
          page.value = nextPage
          hasMore.value = res.data.data.pagination.page < res.data.data.pagination.totalPages
          // 更新缓存
          saveCache(merged, nextPage, hasMore.value)
        }
      } catch (err) {
        console.error('加载更多新闻失败:', err)
        alert('加载更多失败，请重试')
      } finally {
        loadingMore.value = false
      }
    }

    const openNews = (item) => {
      // App 内打开新闻详情页，而不是外部浏览器
      window.location.href = '/home/news/' + item.id
    }

    const formatTime = (timeStr) => {
      if (!timeStr) return ''
      const d = new Date(timeStr)
      const now = new Date()
      const diffMs = now - d
      const diffMin = Math.floor(diffMs / 60000)
      const diffHour = Math.floor(diffMs / 3600000)

      if (diffMin < 60) return `${diffMin}分钟前`
      if (diffHour < 24) return `${diffHour}小时前`

      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hour = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${min}`
    }

    onMounted(() => fetchNews())

    return { newsList, loading, loadingMore, error, hasMore, openNews, formatTime, loadMore, fetchNews }
  }
}
</script>

<style scoped>
.news-section {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.news-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.news-header h3 {
  font-size: 17px;
  color: var(--text-primary);
  margin: 0;
}

.news-source {
  font-size: 11px;
  color: var(--text-light);
  background: var(--bg-primary);
  padding: 3px 10px;
  border-radius: 20px;
}

.news-loading {
  text-align: center;
  padding: 30px 0;
  color: var(--text-light);
}

.news-error {
  text-align: center;
  padding: 30px 0;
  color: #e74c3c;
  font-size: 14px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.news-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-light);
}

.news-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.news-card-body {
  flex: 1;
  min-width: 0;
}

.news-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 视频/文章标签 */
.news-type-tag {
  display: inline-block;
  font-size: 10px;
  padding: 0 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  font-weight: 500;
  line-height: 18px;
}

.news-type-tag.video {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.news-type-tag.article {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

/* 视频卡片特殊样式 */
.news-card.video {
  border-left: 3px solid #ff9800;
}

.news-card-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-light);
}

.news-reporter {
  color: var(--color-primary);
  font-weight: 500;
}

.news-card-image {
  width: 90px;
  height: 90px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--border-light);
}

.news-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.load-more-wrapper {
  text-align: center;
  padding: 8px 0 4px;
}

.load-more-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed var(--border-light);
  border-radius: 12px;
  background: transparent;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: var(--border-light);
  color: var(--text-light);
}

.load-end-text {
  text-align: center;
  padding: 12px 0 4px;
  font-size: 13px;
  color: var(--text-light);
}
</style>
