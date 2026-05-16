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
        <!-- 视频加载中 -->
        <div v-if="videoStatus === 'loading'" class="video-loading">
          <div class="video-loading-spinner"></div>
          <div class="video-loading-text">{{ $t('loading') }}</div>
        </div>
        <!-- 视频播放器（始终渲染，通过CSS控制显示，确保ref可用） -->
        <video
          ref="videoPlayer"
          class="video-player"
          :class="{ 'video-hidden': videoStatus !== 'ready' }"
          controls
          playsinline
          webkit-playsinline
          x5-playsinline
        ></video>
        <!-- 视频加载失败时显示播放按钮 -->
        <div v-if="videoStatus === 'idle'" class="video-placeholder" @click="loadVideo">
          <div class="video-play-icon">▶</div>
          <div class="video-play-text">点击播放视频</div>
        </div>
        <div v-if="videoStatus === 'error'" class="video-error-state">
          <p>{{ videoError }}</p>
          <button class="retry-btn" @click="loadVideo">重试</button>
        </div>
      </div>

      <!-- 文章新闻：展示文字内容 -->
      <div v-else class="news-content" v-html="renderContent(news.fullContent || news.content || news.summary || '')"></div>

      <div class="news-footer">
        <a v-if="news.source_url" :href="news.source_url" target="_blank" class="source-link">
          {{ news.type === 'video' ? '在央视网观看 ↗' : '查看原文 ↗' }}
        </a>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import Hls from 'hls.js'

export default {
  name: 'NewsDetail',
  setup() {
    const news = ref(null)
    const loading = ref(true)
    const error = ref('')
    const fontSize = ref(16)
    const videoStatus = ref('idle') // 'idle' | 'loading' | 'ready' | 'error'
    const videoError = ref('')
    const videoPlayer = ref(null)
    let hlsInstance = null

    const newsId = window.location.pathname.split('/').pop()

    /**
     * 使用 hls.js 播放 m3u8 视频
     */
    const playVideo = (url) => {
      const video = videoPlayer.value
      if (!url || !video) {
        videoStatus.value = 'error'
        videoError.value = '播放器未就绪'
        return
      }

      // 清理旧实例
      if (hlsInstance) {
        hlsInstance.destroy()
        hlsInstance = null
      }

      // 移动端 Edge/Chrome 以及 Safari 都原生支持 HLS
      // canPlayType 返回 "probably" 或 "maybe" 都表示支持
      const canNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== ''
      if (canNativeHls) {
        video.src = url
        video.addEventListener('error', () => {
          videoError.value = '视频加载失败'
          videoStatus.value = 'error'
        }, { once: true })
        video.play().then(() => {
          videoStatus.value = 'ready'
        }).catch(() => {
          videoStatus.value = 'ready'
        })
        return
      }

      // 使用 hls.js（通过后端代理加载，代理已处理防盗链）
      try {
        if (!Hls.isSupported()) {
          videoError.value = '您的浏览器不支持播放此视频'
          videoStatus.value = 'error'
          return
        }

        hlsInstance = new Hls()
        hlsInstance.loadSource(url)
        hlsInstance.attachMedia(video)

        let parsed = false
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          parsed = true
          videoStatus.value = 'ready'
          video.play().catch(() => {})
        })

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS错误:', data.type, data.details, data.reason)
          if (data.fatal) {
            hlsInstance.destroy()
            hlsInstance = null
            videoError.value = '视频加载失败'
            videoStatus.value = 'error'
          }
        })

        // 20秒超时检测
        setTimeout(() => {
          if (!parsed && videoStatus.value === 'loading') {
            videoError.value = '视频加载超时'
            videoStatus.value = 'error'
          }
        }, 20000)
      } catch (e) {
        console.error('hls.js错误:', e)
        videoError.value = '视频初始化失败'
        videoStatus.value = 'error'
      }
    }

    /**
     * 加载并播放视频（通过后端代理）
     */
    const loadVideo = async () => {
      if (!news.value || !news.value.id) return
      videoStatus.value = 'loading'
      videoError.value = ''
      try {
        const res = await axios.get('/api/news/' + news.value.id + '/video', { timeout: 20000 })
        if (res.data.success && res.data.data.videoUrl) {
          // 通过后端代理加载 m3u8 和 ts，代理已处理防盗链和路径重写
          const proxyUrl = '/api/video/proxy?url=' + encodeURIComponent(res.data.data.videoUrl)
          await nextTick()
          setTimeout(() => playVideo(proxyUrl), 100)
        } else {
          videoError.value = res.data.message || '无法获取视频播放地址'
          videoStatus.value = 'error'
        }
      } catch (err) {
        console.error('加载视频失败:', err)
        videoError.value = '视频加载失败，请重试'
        videoStatus.value = 'error'
      }
    }

    const fetchNewsDetail = async () => {
      loading.value = true
      error.value = ''
      try {
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

    const openVideoPage = () => {
      if (news.value && news.value.source_url) {
        window.open(news.value.source_url, '_blank')
      }
    }

    const formatDate = (d) => {
      if (!d) return ''
      const date = new Date(d)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const renderContent = (text) => {
      if (!text) return ''
      return text
        .split(/\n{2,}/)
        .map(para => para.trim())
        .filter(para => para.length > 0)
        .map(para => {
          const lines = para.split(/\n/).map(line => line.trim()).filter(line => line.length > 0)
          return '<p>' + lines.join('<br>') + '</p>'
        })
        .join('')
    }

    onMounted(fetchNewsDetail)

    return { news, loading, error, fontSize, fetchNewsDetail, goBack, formatDate, renderContent, loadVideo, videoStatus, videoError, videoPlayer }
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
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  background: #000;
}

.video-player {
  width: 100%;
  display: block;
  background: #000;
  max-height: 500px;
}

.video-player.video-hidden {
  display: none;
}

/* 视频加载中 */
.video-loading {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111;
  gap: 16px;
}

.video-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.video-loading-text {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}

/* 视频播放按钮 */
.video-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  cursor: pointer;
  transition: all 0.3s;
}

.video-placeholder:hover {
  background: linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%);
}

.video-play-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: 12px;
  border: 3px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s;
}

.video-placeholder:hover .video-play-icon {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.1);
}

.video-play-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* 视频错误状态 */
.video-error-state {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  gap: 12px;
  padding: 20px;
  box-sizing: border-box;
}

.video-error-state p {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  margin: 0;
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
