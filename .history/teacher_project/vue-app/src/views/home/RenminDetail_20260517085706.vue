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
import { useRoute, useRouter } from 'vue-router'

export default {
  name: 'RenminDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const article = ref(null)
    const loading = ref(true)

    const goBack = () => {
      router.push('/home/articles')
    }

    // 处理内容中的图片路径
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
      // 从路由 state 获取文章数据
      if (route.params.articleData) {
        try {
          article.value = JSON.parse(route.params.articleData)
        } catch (e) {
          // 如果解析失败，尝试从 query 获取
          const data = route.query.data
          if (data) {
            try {
              article.value = JSON.parse(data)
            } catch (e2) {
              console.error('解析文章数据失败:', e2)
            }
          }
        }
      }
      loading.value = false
    })

    return { article, loading, goBack, renderContent }
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
