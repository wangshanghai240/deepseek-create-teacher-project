<template>
  <div class="detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">‹ {{ $t('back') }}</button>
      <span class="top-title" v-if="article">{{ article.title }}</span>
      <button class="external-btn" @click="openOriginal" title="在浏览器中打开">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">{{ $t('loading') }}</div>

    <!-- iframe 容器 -->
    <div v-else-if="article" class="iframe-container">
      <iframe
        :src="article.url"
        class="article-iframe"
        frameborder="0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        @load="onIframeLoad"
      ></iframe>
      <!-- iframe 加载提示 -->
      <div v-if="iframeLoading" class="iframe-loading">
        <span class="loading-spinner"></span>
        <span>正在加载文章...</span>
      </div>
    </div>
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
    const iframeLoading = ref(true)

    const goBack = () => {
      router.push('/home/articles?tab=renmin')
    }

    const onIframeLoad = () => {
      iframeLoading.value = false
    }

    const openOriginal = () => {
      if (article.value?.url) {
        window.open(article.value.url, '_blank')
      }
    }

    onMounted(() => {
      const stored = sessionStorage.getItem('renmin_article')
      if (stored) {
        try {
          article.value = JSON.parse(stored)
        } catch (e) {
          console.error('解析文章数据失败:', e)
        }
      }
      loading.value = false
    })

    return { article, loading, iframeLoading, goBack, onIframeLoad, openOriginal }
  }
}
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  max-width: 100%;
  margin: 0 auto;
  overflow: hidden;
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
  flex-shrink: 0;
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

.iframe-container {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.article-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.iframe-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bg-primary);
  color: var(--text-muted);
  font-size: 14px;
  z-index: 1;
  transition: opacity 0.3s;
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
</style>
