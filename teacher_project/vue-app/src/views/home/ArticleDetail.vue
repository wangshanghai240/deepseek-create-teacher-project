<template>
  <div class="detail-page" :style="{ fontSize: fontSize + 'px' }">
    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <div class="font-controls">
        <button class="font-btn" @click="fontSize = Math.max(14, fontSize - 2)">A-</button>
        <span class="font-size">{{ fontSize }}px</span>
        <button class="font-btn" @click="fontSize = Math.min(28, fontSize + 2)">A+</button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">{{ $t('loading') }}</div>

    <template v-else-if="post">
      <div class="post-header">
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="post-meta">
          <span>👤 {{ post.author }}</span>
          <span>{{ formatDate(post.created_at) }}</span>
          <button class="download-btn" @click="downloadPDF" title="下载PDF">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="pdf-content" class="post-content" v-html="renderContent(post.content)"></div>

      <!-- 点赞/点踩 -->
      <div class="like-bar">
        <button class="like-btn" :class="{ active: likeState === 1 }" @click="toggleLike(1)">
          <span class="hand-icon" :class="{ anim: animLike }">👍</span>
          <span>{{ likeCount }}</span>
        </button>
        <button class="like-btn dislike" :class="{ active: likeState === -1 }" @click="toggleLike(-1)">
          <span class="hand-icon" :class="{ anim: animDislike }">👎</span>
          <span>{{ dislikeCount }}</span>
        </button>
      </div>

      <button v-if="canEdit" class="edit-article-btn" @click="editArticle">✏️ 编辑文章</button>

      <!-- 下载进度条 -->
      <Transition name="fade">
        <div v-if="downloading" class="download-progress-overlay">
          <div class="download-progress-card">
            <div class="download-spinner"></div>
            <div class="download-status">{{ downloadStatusText }}</div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ downloadProgress }}%</div>
          </div>
        </div>
      </Transition>

      <!-- Toast -->
      <div v-if="showToast" class="toast-bar">✅ {{ toastMessage }}</div>

      <!-- 评论区域 -->
      <div class="comments-section">
        <h3 class="comments-title">💬 评论 ({{ comments.length }})</h3>

        <div class="comment-form">
          <textarea v-model="commentContent" placeholder="写下你的评论..." rows="3"></textarea>
          <button class="comment-btn" @click="submitComment" :disabled="!commentContent.trim() || commenting">
            {{ commenting ? '发表中...' : '发表评论' }}
          </button>
        </div>

        <div v-if="comments.length === 0" class="no-comments">暂无评论，快来写第一条评论吧</div>

        <div v-for="c in comments" :key="c.id" class="comment-item">
          <div class="comment-avatar-row">
            <div class="comment-avatar" :style="{ background: getAvatarColor(c.author_name) }">
              {{ (c.author_name || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <strong>{{ c.author_name }}</strong>
                <span class="comment-date">{{ formatDate(c.created_at) }}</span>
              </div>
              <p class="comment-text">{{ c.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import html2pdf from 'html2pdf.js'

export default {
  name: 'ArticleDetail',
  setup() {
    const post = ref(null)
    const comments = ref([])
    const loading = ref(true)
    const commentContent = ref('')
    const commenting = ref(false)
    const fontSize = ref(16)
    const showToast = ref(false)
    const toastMessage = ref('')
    let toastTimer = null
    const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const isAdmin = ref(localStorage.getItem('isAdmin') === 'true')

    const avatarColors = ['linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#fa709a,#fee140)']

    const getAvatarColor = (name) => {
      let hash = 0
      for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
      return avatarColors[Math.abs(hash) % avatarColors.length]
    }

    const downloading = ref(false)
    const downloadProgress = ref(0)
    const downloadPhase = ref('') // '' | 'generating' | 'saving'
    const downloadStatusText = computed(() => {
      if (downloadPhase.value === 'saving') return '请选择保存位置...'
      return '正在生成 PDF...'
    })

    const showSuccessToast = (msg) => {
      toastMessage.value = msg
      showToast.value = true
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => { showToast.value = false }, 2000)
    }

    const canEdit = computed(() => post.value && (isAdmin.value || post.value.author === currentUser.value.username))

    const postId = window.location.pathname.split('/').pop()
    const likeCount = ref(0)
    const dislikeCount = ref(0)
    const likeState = ref(0)
    const animLike = ref(false)
    const animDislike = ref(false) // 1=赞 -1=踩 0=无

    const fetchData = async () => {
      try {
        const [p, c, l] = await Promise.all([
          axios.get('/api/posts/' + postId, { timeout: 10000 }),
          axios.get('/api/posts/' + postId + '/comments', { timeout: 10000 }),
          axios.get('/api/posts/' + postId + '/likes?username=' + encodeURIComponent(currentUser.value.username), { timeout: 10000 })
        ])
        if (p.data.success) post.value = p.data.data
        if (c.data.success) comments.value = c.data.data
        if (l.data.success) {
          likeCount.value = l.data.data.likes
          dislikeCount.value = l.data.data.dislikes
          likeState.value = l.data.data.userType
        }
      } catch (err) { console.error(err) }
      finally { loading.value = false }
    }

    const toggleLike = async (type) => {
      if (!currentUser.value.username) { alert('请先登录'); return }
      try {
        const finalType = likeState.value === type ? 0 : type
        const res = await axios.post('/api/posts/' + postId + '/likes', {
          username: currentUser.value.username,
          type: finalType
        }, { timeout: 10000 })
        if (res.data.success) {
          likeCount.value = res.data.data.likes
          dislikeCount.value = res.data.data.dislikes
          likeState.value = finalType
          if (finalType === 1) { animLike.value = true; setTimeout(() => animLike.value = false, 400); showSuccessToast('点赞成功') }
          else if (finalType === -1) { animDislike.value = true; setTimeout(() => animDislike.value = false, 400); showSuccessToast('点踩成功') }
          else showSuccessToast('已取消')
        }
      } catch (err) { alert('操作失败') }
    }

    const formatDate = (d) => {
      if (!d) return ''
      const date = new Date(d)
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
    }

    const renderContent = (text) => {
      if (!text) return ''
      return text.replace(/\n/g, '<br>')
    }

    const submitComment = async () => {
      if (!commentContent.value.trim()) return
      commenting.value = true
      try {
        await axios.post('/api/posts/' + postId + '/comments', {
          author_name: currentUser.value.username || '匿名',
          content: commentContent.value
        }, { timeout: 10000 })
        commentContent.value = ''
        showSuccessToast('评论成功')
        const c = await axios.get('/api/posts/' + postId + '/comments', { timeout: 10000 })
        if (c.data.success) comments.value = c.data.data
      } catch (err) { alert('评论失败') }
      finally { commenting.value = false }
    }

    const downloadPDF = async () => {
      const element = document.getElementById('pdf-content')
      if (!element) return

      // 第1步：显示进度条，开始生成 PDF
      downloading.value = true
      downloadProgress.value = 0
      downloadPhase.value = 'generating'
      const fileName = (post.value?.title || 'article') + '.pdf'

      try {
        // 生成 PDF 获取 Blob 数据
        const blob = await html2pdf()
          .set({
            margin:        [10, 10],
            filename:      fileName,
            image:         { type: 'jpeg', quality: 0.98 },
            html2canvas:   { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:         { unit: 'mm', format: 'a4', orientation: 'portrait' },
            progressCallback: (ratio) => {
              downloadProgress.value = Math.round(ratio * 100)
            }
          })
          .from(element)
          .outputPdf('blob')

        // 第2步：PDF 生成完毕，提示用户选择保存位置
        downloadProgress.value = 100
        downloadPhase.value = 'saving'

        // 尝试使用 File System Access API（移动端 Chrome 支持）
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{
                description: 'PDF 文件',
                accept: { 'application/pdf': ['.pdf'] }
              }]
            })
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
          } catch (err) {
            // 用户取消选择，不报错
            if (err.name !== 'AbortError' && err.name !== 'SecurityError') throw err
            downloading.value = false
            return
          }
        } else {
          // 降级方案：通过 a 标签触发系统保存对话框
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }

        // 第3步：保存完成，提示成功
        downloading.value = false
        downloadProgress.value = 0
        downloadPhase.value = ''
        showSuccessToast('PDF 下载成功')
      } catch (err) {
        downloading.value = false
        downloadProgress.value = 0
        downloadPhase.value = ''
        console.error(err)
        alert('下载失败，请重试')
      }
    }

    const goBack = () => { window.location.href = '/home/articles' }

    const editArticle = () => {
      window.location.href = '/home/articles/edit/' + postId
    }

    onMounted(fetchData)

    return { post, comments, loading, commentContent, commenting, fontSize, canEdit, showToast, toastMessage, likeCount, dislikeCount, likeState, animLike, animDislike, formatDate, renderContent, submitComment, goBack, editArticle, getAvatarColor, toggleLike, downloadPDF, downloading, downloadProgress, downloadStatusText }
  }
}
</script>

<style scoped>
.toast-bar {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  background: var(--color-success); color: white; padding: 12px 24px;
  border-radius: 12px; font-size: 15px; font-weight: 600; z-index: 9999;
  box-shadow: 0 4px 20px rgba(52, 211, 153, 0.35);
  display: flex; align-items: center; gap: 8px;
  animation: toastIn 0.3s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.detail-page { max-width: 600px; margin: 0 auto; line-height: 1.8; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; position: sticky; top: 0; z-index: 10; background: var(--bg-primary); padding: 12px 0; }
.back-btn { background: none; border: none; font-size: 24px; color: var(--color-primary); cursor: pointer; padding: 0; font-weight: 500; }
.font-controls { display: flex; align-items: center; gap: 8px; }
.font-btn { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--border-color); background: var(--bg-card); cursor: pointer; font-size: 14px; font-weight: bold; color: var(--text-primary); }
.font-size { font-size: 12px; color: var(--text-muted); min-width: 36px; text-align: center; }
.loading-state { text-align: center; padding: 60px; color: var(--text-muted); }
.post-header { margin-bottom: 20px; }
.post-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; line-height: 1.4; }
.post-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-muted); align-items: center; }
.download-btn {
  margin-left: auto; width: 34px; height: 34px; border-radius: 50%;
  border: 1.5px solid var(--border-color); background: var(--bg-card);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all 0.2s;
}
.download-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--bg-primary-light); }
.post-content { background: var(--bg-card); border-radius: 14px; padding: 24px; box-shadow: var(--shadow-sm); margin-bottom: 16px; color: var(--text-primary); }
.like-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.like-btn {
  flex: 1; padding: 14px; border-radius: 14px; border: 1.5px solid var(--border-color);
  background: var(--bg-card); cursor: pointer; font-size: 16px; font-weight: 600;
  color: var(--text-secondary); transition: all 0.25s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  -webkit-tap-highlight-color: transparent;
}
.like-btn:active { transform: scale(0.95); }
.like-btn.active { border-color: var(--color-primary); background: var(--bg-primary-light); color: var(--color-primary); }
.like-btn:hover { border-color: var(--color-primary); }
.like-btn.dislike.active { border-color: var(--color-error); background: rgba(239,68,68,0.1); color: var(--color-error); }
.hand-icon { display: inline-block; font-size: 24px; transition: transform 0.2s; }
.hand-icon.anim {
  animation: handPop 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
@keyframes handPop {
  0% { transform: scale(1); }
  30% { transform: scale(1.5) rotate(-15deg); }
  60% { transform: scale(0.9) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.edit-article-btn { width: 100%; padding: 12px; background: var(--color-primary-gradient); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
.comments-section { background: var(--bg-card); border-radius: 14px; padding: 20px; box-shadow: var(--shadow-sm); margin-bottom: 80px; }
.comments-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.comment-form { margin-bottom: 20px; }
.comment-form textarea { width: 100%; padding: 12px; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); font-family: inherit; resize: vertical; margin-bottom: 10px; }
.comment-form textarea:focus { border-color: var(--color-primary); }
.comment-btn { width: 100%; padding: 10px; background: var(--color-primary-gradient); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.comment-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.no-comments { text-align: center; color: var(--text-muted); font-size: 14px; padding: 20px 0; }
.comment-item { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.comment-item:last-child { border-bottom: none; }
.comment-avatar-row { display: flex; gap: 12px; align-items: flex-start; }
.comment-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 15px; font-weight: bold;
}
.comment-body { flex: 1; min-width: 0; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center; }
.comment-header strong { font-size: 14px; color: var(--text-primary); }
.comment-date { font-size: 11px; color: var(--text-light); }
.comment-text { font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin-top: 2px; }

/* 下载进度条 */
.download-progress-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45); display: flex; align-items: center;
  justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
}
.download-progress-card {
  background: var(--bg-card); border-radius: 20px; padding: 40px 32px;
  text-align: center; max-width: 300px; width: 85%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: modalIn 0.25s ease;
}
.download-spinner {
  width: 48px; height: 48px; border: 4px solid var(--border-color);
  border-top-color: var(--color-primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.download-status { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.progress-track {
  width: 100%; height: 8px; background: var(--bg-hover);
  border-radius: 4px; overflow: hidden; margin-bottom: 8px;
}
.progress-fill {
  height: 100%; background: var(--color-primary-gradient);
  border-radius: 4px; transition: width 0.3s ease;
}
.progress-text { font-size: 14px; color: var(--text-muted); font-weight: 500; }
@keyframes modalIn { from { transform: scale(0.9); opacity:0; } to { transform: scale(1); opacity:1; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
