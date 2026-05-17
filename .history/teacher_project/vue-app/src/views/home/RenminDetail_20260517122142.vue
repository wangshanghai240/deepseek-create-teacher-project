<template>
  <div class="detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">‹ {{ $t('back') }}</button>
      <span class="top-title" v-if="article">{{ article.title }}</span>
      <button class="external-btn" @click="openOriginal" title="在浏览器中打开原文">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">{{ $t('loading') }}</div>

    <template v-else-if="article">
      <!-- 标题 -->
      <div class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span>📰 {{ article.source || '人民日报' }}</span>
        </div>
      </div>

      <!-- 图片 -->
      <div v-if="article.image" class="article-image">
        <img :src="article.image" :alt="article.title" />
      </div>

      <!-- 内容加载中 -->
      <div v-if="fetchingContent" class="content-loading">
        <span class="loading-spinner"></span>
        <span>正在加载文章内容...</span>
      </div>

      <!-- 文章内容 -->
      <div v-else-if="article.content" class="article-content" v-html="article.content"></div>

      <!-- 没有内容时的提示和原文链接 -->
      <div v-else class="no-content">
        <p>暂未获取到文章内容</p>
        <button class="original-btn" @click="openOriginal">在浏览器中查看原文 ↗</button>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'RenminDetail',
  setup() {
    const router = useRouter()
    const article = ref(null)
    const loading = ref(true)
    const fetchingContent = ref(false)

    const goBack = () => {
      router.push('/home/articles?tab=renmin')
    }

    const openOriginal = () => {
      if (article.value?.url) {
        window.open(article.value.url, '_blank')
      }
    }

    onMounted(async () => {
      const stored = sessionStorage.getItem('renmin_article')
      if (stored) {
        try {
          article.value = JSON.parse(stored)
        } catch (e) {
          console.error('解析文章数据失败:', e)
        }
      }

      // 请求完整文章内容
      if (!article.value?.content) {
        fetchingContent.value = true
        try {
          const apiUrl = '/api/xinhua/detail?url=' + encodeURIComponent(article.value.url)
          const res = await fetch(apiUrl, { timeout: 15000 })
          const result = await res.json()
          if (result.success && result.data) {
            if (result.data.content) article.value.content = result.data.content
            if (result.data.image && !article.value.image) article.value.image = result.data.image
            if (result.data.url) article.value.url = result.data.url
          }
        } catch (err) {
          console.error('获取详情失败:', err)
        } finally {
          fetchingContent.value = false
        }
      }

      loading.value = false
    })

    return { article, loading, fetchingContent, goBack, openOriginal }
  }
}
</script>

<style scoped>
.detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 12px;
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 20;
}

.back-btn {
  background: var(--bg-hover);
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--bg-active);
}

.top-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-btn {
  background: var(--bg-hover);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  flex-shrink: 0;
}

.external-btn:hover {
  background: var(--bg-active);
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.article-header {
  margin-bottom: 20px;
}

.article-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
  margin-bottom: 12px;
}

.article-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.article-image {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
}

.article-image img {
  width: 100%;
  height: auto;
  display: block;
}

.article-content {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
}

.article-content :deep(.article-p) {
  text-indent: 2em;
  line-height: 1.8;
  margin-bottom: 12px;
  font-size: 16px;
}

.article-content :deep(.article-img) {
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.article-content :deep(.article-img img) {
  width: 100%;
  height: auto;
  display: block;
}

.article-content :deep(.article-video) {
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.article-content :deep(.article-video video) {
  width: 100%;
  display: block;
  max-height: 400px;
}

.content-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-muted);
  font-size: 14px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-content {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.original-btn {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
}

.original-btn:hover {
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.4);
}
</style>
