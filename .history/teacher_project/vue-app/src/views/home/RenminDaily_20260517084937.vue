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

    // 从 peopleapp.com 获取人民日报文章
    const fetchArticles = async () => {
      loading.value = true
      error.value = ''
      try {
        // 使用 free CORS 代理获取内容
        const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(
          'https://peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20'
        )
        const res = await fetch(url, { timeout: 15000 })
        if (!res.ok) throw new Error('请求失败: ' + res.status)
        
        let data
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          data = await res.json()
        } else {
          const text = await res.text()
          try {
            data = JSON.parse(text)
          } catch (e) {
            // 如果不是 JSON，尝试从 HTML 中解析
            console.warn('Response is not JSON, parsing HTML...')
            data = parseHtmlArticles(text)
          }
        }

        if (data && data.data && Array.isArray(data.data)) {
          articles.value = data.data.map(item => ({
            title: item.title || item.content_text || '',
            summary: item.summary || item.description || '',
            image: item.image_url || item.cover_url || item.images?.[0] || '',
            time: item.create_time || item.publish_time || item.ctime || '',
            source: item.source_name || '人民日报',
            url: item.share_url || item.url || item.article_url || ''
          })).filter(item => item.title)
        } else if (Array.isArray(data)) {
          articles.value = data.map(item => ({
            title: item.title || '',
            summary: item.summary || item.content_text || '',
            image: item.image_url || item.cover_url || '',
            time: item.create_time || item.publish_time || '',
            source: item.source_name || '人民日报',
            url: item.share_url || item.url || ''
          })).filter(item => item.title)
        } else if (data && data.result && Array.isArray(data.result)) {
          articles.value = data.result.map(item => ({
            title: item.title || '',
            summary: item.summary || item.desc || '',
            image: item.image_url || item.pic || '',
            time: item.create_time || item.time || '',
            source: item.source_name || '人民日报',
            url: item.share_url || item.url || ''
          })).filter(item => item.title)
        } else {
          // Fallback: parse HTML content
          const htmlText = data ? JSON.stringify(data) : text
          articles.value = parseHtmlArticles(htmlText)
        }

        if (articles.value.length === 0) {
          // 尝试从备用接口获取（人民日报官方RSS）
          await fetchFromBackup()
        }
      } catch (err) {
        console.error('人民日报获取失败:', err)
        error.value = '获取人民日报文章失败，请稍后重试'
      } finally {
        loading.value = false
      }
    }

    // 备用方案：解析 HTML
    const fetchFromBackup = async () => {
      try {
        const backupUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(
          'https://www.peopleapp.com/api/v2/feed/list?feed_id=130&page=1&page_size=20'
        )
        const res = await fetch(backupUrl)
        if (!res.ok) return
        const data = await res.json()
        if (data?.data && Array.isArray(data.data)) {
          articles.value = data.data.map(item => ({
            title: item.title || '',
            summary: item.summary || item.description || '',
            image: item.image_url || item.cover_url || '',
            time: item.create_time || item.publish_time || '',
            source: '人民日报',
            url: item.share_url || item.url || ''
          })).filter(item => item.title)
        }
      } catch (e) {
        console.warn('备用接口也失败了:', e)
      }
    }

    // 解析 HTML 中的文章数据
    const parseHtmlArticles = (html) => {
      const results = []
      // 尝试匹配 JSON 数据块
      const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[^<]+})/)
      if (jsonMatch) {
        try {
          const state = JSON.parse(jsonMatch[1])
          // 递归查找文章列表
          const findArticles = (obj) => {
            if (!obj || typeof obj !== 'object') return null
            if (Array.isArray(obj)) {
              if (obj.length > 0 && obj[0].title) return obj
              for (const item of obj) {
                const found = findArticles(item)
                if (found) return found
              }
              return null
            }
            for (const val of Object.values(obj)) {
              const found = findArticles(val)
              if (found) return found
            }
            return null
          }
          const found = findArticles(state)
          if (found) {
            return found.map(item => ({
              title: item.title || '',
              summary: item.summary || item.desc || '',
              image: item.image_url || item.pic || item.cover || '',
              time: item.create_time || item.time || '',
              source: item.source_name || '人民日报',
              url: item.share_url || item.url || ''
            })).filter(item => item.title)
          }
        } catch (e) { /* ignore */ }
      }
      return results
    }

    const openArticle = (item) => {
      if (item.url) {
        window.open(item.url, '_blank')
      }
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
