<template>
  <div class="detail-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">‹ {{ $t('back') }}</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">{{ $t('loading') }}</div>

    <template v-else-if="article">
      <div class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span>📰 {{ article.source || '人民网' }}</span>
          <span>{{ article.time }}</span>
        </div>
      </div>

      <!-- 详情加载中 -->
      <div v-if="fetchingDetail" class="loading-detail">
        <span class="loading-spinner"></span>
        <span>正在加载文章内容...</span>
      </div>

      <!-- 文章图片 -->
      <div v-if="article.image" class="article-image">
        <img :src="article.image" :alt="article.title" />
      </div>

      <!-- 文章内容 -->
      <div v-if="renderContent" class="article-content" v-html="renderContent"></div>

      <!-- 内容为空时提示 -->
      <div v-if="!fetchingDetail && !renderContent" class="no-content">
        <p>暂未获取到文章内容</p>
      </div>

      <!-- 原文链接 -->
      <div class="source-link">
        <button class="original-btn" @click="openOriginal">
          在浏览器中查看原文 ↗
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'RenminDetail',
  setup() {
    const router = useRouter()
    const article = ref(null)
    const loading = ref(true)
    const fetchingDetail = ref(false)

    const goBack = () => {
      router.push('/home/articles?tab=renmin')
    }

    // 处理内容
    const renderContent = computed(() => {
      if (!article.value?.content) return ''
      let html = article.value.content
      // 修复相对路径的图片
      html = html.replace(/src=["']\/(mediafile[^"']*)["']/g, (match, p1) => {
        return `src="http://www.people.com.cn/${p1}"`
      })
      // 添加样式
      html = html.replace(/<p /g, '<p style="text-indent: 2em; line-height: 1.8; margin-bottom: 12px; font-size: 16px;" ')
      html = html.replace(/<img /g, '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;" ')
      return html
    })

    onMounted(() => {
      // 从 sessionStorage 获取文章数据
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

    const openOriginal = () => {
      if (article.value?.url) {
        window.open(article.value.url, '_blank')
      }
    }

    return { article, loading, goBack, renderContent, openOriginal }
  }
}
</script>

<style scoped>
.detail-page {
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 8px 0 16px;
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 10;
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
}

.back-btn:hover {
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

.article-content :deep(p) {
  text-indent: 2em;
  line-height: 1.8;
  margin-bottom: 12px;
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px auto;
  display: block;
}

.source-link {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.source-link a {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.source-link a:hover {
  text-decoration: underline;
}

.loading-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--text-muted);
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
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
  font-size: 15px;
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
  transition: all 0.2s;
}

.original-btn:hover {
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.4);
  transform: translateY(-1px);
}
</style>
