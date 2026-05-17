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

      <!-- 文章图片 -->
      <div v-if="article.image" class="article-image">
        <img :src="article.image" :alt="article.title" />
      </div>

      <!-- 文章内容 -->
      <div class="article-content" v-html="renderContent"></div>

      <!-- 原文链接 -->
      <div class="source-link">
        <a :href="article.url" target="_blank" rel="noopener noreferrer">
          查看原文 ↗
        </a>
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

    onMounted(async () => {
      // 从 sessionStorage 获取文章数据
      const stored = sessionStorage.getItem('renmin_article')
      if (stored) {
        try {
          article.value = JSON.parse(stored)
        } catch (e) {
          console.error('解析文章数据失败:', e)
        }
      }
      
      // 如果文章没有内容，调用后端获取详情
      if (article.value && !article.value.content && article.value.url) {
        fetchingDetail.value = true
        try {
          const res = await fetch('/api/renmin/detail?url=' + encodeURIComponent(article.value.url), { timeout: 15000 })
          const result = await res.json()
          if (result.success && result.data) {
            if (result.data.content) article.value.content = result.data.content
            if (result.data.summary && !article.value.summary) article.value.summary = result.data.summary
            if (result.data.image && !article.value.image) article.value.image = result.data.image
            if (result.data.url) article.value.url = result.data.url
          }
        } catch (err) {
          console.error('获取详情失败:', err)
        } finally {
          fetchingDetail.value = false
        }
      }
      
      loading.value = false
    })

    const openOriginal = () => {
      if (article.value?.url) {
        window.open(article.value.url, '_blank')
      }
    }

    return { article, loading, fetchingDetail, goBack, renderContent, openOriginal }
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
</style>
