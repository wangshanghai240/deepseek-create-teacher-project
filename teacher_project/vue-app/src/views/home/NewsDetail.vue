<template>
  <div class="news-detail-page" :style="{ fontSize: fontSize + 'px' }">
    <div class="page-header">
      <button class="back-btn" @click="goBack">← {{ $t('back') }}</button>
      <div class="font-controls">
        <button class="font-btn" @click="fontSize = Math.max(14, fontSize - 2)">A-</button>
        <span class="font-size">{{ fontSize }}px</span>
        <button class="font-btn" @click="fontSize = Math.min(28, fontSize + 2)">A+</button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">{{ $t('loading') }}</div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchNewsDetail">重试</button>
    </div>

    <template v-else-if="news">
      <div class="news-header">
        <h1 class="news-title">{{ news.title }}</h1>
        <div class="news-type-badge" :class="news.type">
          {{ news.type === 'video' ? '📺 视频' : '📰 文章' }}
        </div>
        <div class="news-meta">
          <span v-if="news.reporter">📝 {{ news.reporter }}</span>
          <span v-if="news.source">来源：{{ news.source }}</span>
          <span>{{ formatDate(news.created_at) }}</span>
        </div>
        <div v-if="news.image_url" class="news-image">
          <img :src="news.image_url" :alt="news.title" />
        </div>
      </div>

      <!-- 视频新闻：嵌入视频播放 -->
      <div v-if="news.type === 'video' && news.source_url" class="video-wrapper">
        <iframe
          :src="getVideoEmbedUrl(news.source_url)"
          class="video-iframe"
          frameborder="0"
          allowfullscreen
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>

      <!-- 文章新闻：展示文字内容 -->
      <div v-else class="news-content" v-html="renderContent(news.fullContent || news.content || news.summary || '')"></div>

      <div class="news-footer">
        <a v-if="news.source_url" :href="news.source_url" target="_blank" class="source-link">
          {{ news.type === 'video' ? '观看原视频 ↗' : '查看原文 ↗' }}
        </a>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'NewsDetail',
  setup() {
    const news = ref(null)
    const loading = ref(true)
    const error = ref('')
    const fontSize = ref(16)

    const newsId = window.location.pathname.split('/').pop()

    const fetchNewsDetail = async () => {
      loading.value = true
      error.value = ''
      try {
        // 使用 /full 接口，后端会实时抓取原文完整内容
        const res = await axios.get('/api/news/' + newsId + '/full', { timeout: 20000 })
        if (res.data.success) {
          news.value = res.data.data
        } else {
          error.value = '获取新闻详情失败'
        }
      } catch (err) {
        console.error('获取新闻详情失败:', err)
        error.value = '获取新闻详情失败，请检查网络连接'
      } finally {
        loading.value = false
      }
    }

    const goBack = () => {
      window.location.href = '/home/index'
    }

    const formatDate = (d) => {
      if (!d) return ''
      const date = new Date(d)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const renderContent = (text) => {
      if (!text) return ''
      // 替换换行为段落结构，支持连续换行分段
      return text
        .split(/\n{2,}/)
        .map(para => para.trim())
        .filter(para => para.length > 0)
        .map(para => {
          // 段落内的单换行转为<br>
          const lines = para.split(/\n/).map(line => line.trim()).filter(line => line.length > 0)
          return '<p>' + lines.join('<br>') + '</p>'
        })
        .join('')
    }

    /**
     * 将 CCTV 视频 URL 转为可嵌入的 iframe 地址
     * tv.cctv.com 视频可通过特定格式嵌入
     */
    const getVideoEmbedUrl = (url) => {
      if (!url) return ''
      // 从 URL 中提取视频 ID
      const match = url.match(/VIDE(\w+)/)
      if (match) {
        const videoId = match[0]
        return `https://tv.cctv.com/embed/player.php?vid=${videoId}&autoplay=false`
      }
      // 如果无法提取，直接返回原链接（用户点击查看原文打开）
      return url
    }

    onMounted(fetchNewsDetail)

    return { news, loading, error, fontSize, fetchNewsDetail, goBack, formatDate, renderContent, getVideoEmbedUrl }
  }
}
</script>

<style scoped>
.news-detail-page {
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
  padding: 12px 0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-weight: 500;
}

.font-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
}

.font-size {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}

.loading-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
}

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #e74c3c;
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.news-header {
  margin-bottom: 24px;
}

.news-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.4;
}

.news-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.news-image {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.news-image img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
}

.news-content {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.8;
}

.news-content :deep(p) {
  margin-bottom: 16px;
  text-indent: 2em;
  line-height: 1.8;
}

/* 视频/文章标记 */
.news-type-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 20px;
  margin-bottom: 12px;
  font-weight: 500;
}

.news-type-badge.video {
  background: #fff3e0;
  color: #e65100;
}

.news-type-badge.article {
  background: #e3f2fd;
  color: #1565c0;
}

/* 视频播放器容器 */
.video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 宽高比 */
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  background: #000;
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.news-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.source-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.source-link:hover {
  text-decoration: underline;
}
</style>
