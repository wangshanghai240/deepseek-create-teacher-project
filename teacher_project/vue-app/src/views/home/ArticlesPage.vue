<template>
  <div class="articles-page">
    <div class="page-header">
      <div class="page-header-top">
        <h2>{{ isSearchMode ? '开始搜索' : $t('article_title') }}</h2>
        <div class="header-actions">
          <button v-if="!isSearchMode" class="icon-btn search-btn" @click="enterSearchMode">
            <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button v-if="isSearchMode" class="icon-btn search-btn" @click="exitSearchMode">✕</button>
          <button class="add-btn" @click="showCreateModal = true">✏️ {{ '写文章' }}</button>
        </div>
      </div>

      <!-- 搜索框（固定在表头内，随表头一起滚动） -->
      <Transition name="search-slide">
        <div v-if="isSearchMode" class="search-bar">
          <input
            ref="searchInput"
            type="text"
            v-model="searchQuery"
            placeholder="搜索标题或内容..."
            @keydown.enter="doSearch"
          />
        </div>
      </Transition>
    </div>

    <div v-if="searchResultMsg" class="search-result-msg">{{ searchResultMsg }}</div>

    <div v-if="loading" class="loading-state">⏳ {{ $t('loading') }}</div>

    <div v-else-if="articles.length === 0 && !searchResultMsg" class="empty-state">
      <span class="empty-icon">📄</span>
      <p>{{ $t('article_empty') }}</p>
    </div>

    <div v-else class="article-list">
      <div v-for="item in articles" :key="item.id" class="article-card" @click="viewPost(item.id)">
        <h3 class="article-title">{{ item.title }}</h3>
        <p class="article-summary">{{ item.summary || item.content }}{{ (item.summary || item.content).length >= 200 ? '...' : '' }}</p>
        <div class="article-meta">
          <span class="article-author">👤 {{ item.author }}</span>
          <span class="article-stats">
            <span>💬 {{ item.comment_count || 0 }}</span>
            <span>👍 {{ item.like_count || 0 }}</span>
          </span>
          <button v-if="canEdit(item.author)" class="edit-post-btn" @click.stop="editPost(item)">✏️</button>
        </div>
      </div>
    </div>

    <!-- 写文章弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-card create-modal">
          <div class="modal-header">
            <h3>{{ editingPost ? '编辑文章' : '写文章' }}</h3>
            <button class="modal-close" @click="showCreateModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>标题</label>
              <input type="text" v-model="postForm.title" placeholder="请输入文章标题" />
            </div>
            <div class="form-group">
              <label>内容</label>
              <textarea v-model="postForm.content" placeholder="请输入文章内容" rows="8"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button class="btn-save" @click="submitPost" :disabled="submitting">{{ submitting ? '发布中...' : '发布' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'

export default {
  name: 'ArticlesPage',
  setup() {
    const articles = ref([])
    const loading = ref(true)
    const showCreateModal = ref(false)
    const editingPost = ref(null)
    const submitting = ref(false)
    const postForm = ref({ title: '', content: '' })
    const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const isAdmin = ref(localStorage.getItem('isAdmin') === 'true')
    const isSearchMode = ref(false)
    const searchQuery = ref('')
    const searchInput = ref(null)
    const searchResultMsg = ref('')

    const canEdit = (author) => isAdmin.value || author === currentUser.value.username

    const fetchArticles = async (query) => {
      loading.value = true
      searchResultMsg.value = ''
      try {
        const url = query ? `/api/posts?q=${encodeURIComponent(query)}` : '/api/posts'
        const res = await axios.get(url, { timeout: 10000 })
        if (res.data.success) {
          articles.value = res.data.data
          if (query) {
            const count = articles.value.length
            searchResultMsg.value = count > 0 ? `共搜索到 ${count} 篇文章` : '没有找到相关文章'
          }
        }
      } catch (err) { console.error(err) }
      finally { loading.value = false }
    }

    const doSearch = () => {
      fetchArticles(searchQuery.value)
    }

    const enterSearchMode = async () => {
      isSearchMode.value = true
      searchResultMsg.value = ''
      await nextTick()
      if (searchInput.value) searchInput.value.focus()
    }

    const exitSearchMode = () => {
      isSearchMode.value = false
      searchQuery.value = ''
      searchResultMsg.value = ''
      fetchArticles()
    }

    const formatDate = (d) => {
      if (!d) return ''
      const date = new Date(d)
      return `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
    }

    const viewPost = (id) => { window.location.href = '/home/articles/' + id }
    
    const editPost = (item) => {
      window.location.href = '/home/articles/edit/' + item.id
    }

    const submitPost = async () => {
      if (!postForm.value.title.trim() || !postForm.value.content.trim()) return
      submitting.value = true
      try {
        if (editingPost.value) {
          await axios.put('/api/posts/' + editingPost.value.id, {
            title: postForm.value.title, content: postForm.value.content,
            author: currentUser.value.username
          }, { timeout: 10000 })
        } else {
          await axios.post('/api/posts', {
            title: postForm.value.title, content: postForm.value.content,
            author: currentUser.value.username
          }, { timeout: 10000 })
        }
        showCreateModal.value = false
        editingPost.value = null
        postForm.value = { title: '', content: '' }
        fetchArticles()
      } catch (err) { alert('操作失败') }
      finally { submitting.value = false }
    }

    onMounted(fetchArticles)

    return { articles, loading, showCreateModal, editingPost, submitting, postForm, canEdit, isSearchMode, searchQuery, searchInput, searchResultMsg, formatDate, viewPost, editPost, submitPost, enterSearchMode, exitSearchMode, doSearch }
  }
}
</script>

<style scoped>
.articles-page { max-width: 600px; margin: 0 auto; }
.page-header {
  position: sticky; top: 0; z-index: 10; background: var(--bg-primary);
  padding: 16px 0 12px; margin-bottom: 8px;
}
.page-header h2 { font-size: 22px; color: var(--text-primary); }
.page-header-top {
  display: flex; align-items: center; justify-content: space-between;
}
.header-actions { display: flex; gap: 8px; align-items: center; }
.icon-btn {
  border: none; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: var(--text-primary);
}
.search-btn {
  width: auto; height: auto; border-radius: 20px;
  padding: 8px 12px; background: var(--bg-hover);
}
.search-btn:hover { background: var(--bg-active); }
.add-btn { background: var(--color-primary-gradient); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.search-bar { margin-top: 10px; }
.search-bar input {
  width: 100%; padding: 10px 16px; border: 1.5px solid var(--color-primary);
  border-radius: 10px; font-size: 15px; outline: none; box-sizing: border-box;
  background: var(--bg-input); color: var(--text-primary);
}
.search-bar input:focus { box-shadow: 0 0 0 3px rgba(129,140,248,0.2); }
.search-slide-enter-active, .search-slide-leave-active { transition: all 0.25s ease; }
.search-slide-enter-from, .search-slide-leave-to { opacity: 0; transform: translateY(-10px); }
.search-result-msg { text-align: center; padding: 8px 0 12px; font-size: 14px; color: var(--text-secondary); }
.loading-state { background: var(--bg-card); border-radius: 12px; padding: 60px 20px; text-align: center; color: var(--text-muted); box-shadow: var(--shadow-sm); }
.empty-state { background: var(--bg-card); border-radius: 12px; padding: 60px 20px; text-align: center; box-shadow: var(--shadow-sm); }
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.empty-state p { color: var(--text-muted); font-size: 15px; }
.article-list { display: flex; flex-direction: column; gap: 12px; }
.article-card { background: var(--bg-card); border-radius: 14px; padding: 18px 20px; box-shadow: var(--shadow-sm); cursor: pointer; transition: all 0.2s; }
.article-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.article-title { font-size: 17px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-summary { font-size: 13px; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px; }
.article-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-muted); }
.article-author { flex: 1; }
.article-stats { display: flex; gap: 10px; font-size: 12px; }
.edit-post-btn { background: var(--bg-hover); border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px; }
.modal-overlay { position: fixed; top:0;left:0;right:0;bottom:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter: blur(4px); }
.modal-card { background: var(--bg-card); border-radius: 20px; width: 90%; max-width: 420px; overflow: hidden; animation: modalIn 0.25s ease; }
@keyframes modalIn { from { transform: scale(0.9); opacity:0; } to { transform: scale(1); opacity:1; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
.modal-header h3 { font-size: 18px; color: var(--text-primary); }
.modal-close { background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 20px 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-group input, .form-group textarea { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); font-family: inherit; resize: vertical; }
.form-group input:focus, .form-group textarea:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(129,140,248,0.2); }
.modal-footer { display: flex; gap: 12px; padding: 0 24px 20px; }
.btn-cancel, .btn-save { flex: 1; padding: 12px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; }
.btn-cancel { background: var(--bg-hover); color: var(--text-secondary); }
.btn-cancel:hover { background: var(--bg-active); }
.btn-save { background: var(--color-primary-gradient); color: white; }
.btn-save:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(129,140,248,0.4); }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
