<template>
  <div class="editor-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <h2>{{ isNew ? '写文章' : '编辑文章' }}</h2>
      <button class="save-btn" @click="savePost" :disabled="saving">
        {{ saving ? '保存中...' : '发布' }}
      </button>
    </div>

    <!-- 标题输入 -->
    <div class="title-section">
      <input
        type="text"
        v-model="title"
        placeholder="请输入文章标题"
        class="title-input"
      />
    </div>

    <!-- 工具栏 -->
    <div class="toolbar" ref="toolbar">
      <button class="tool-btn" @click="execCmd('bold')" title="加粗"><b>B</b></button>
      <button class="tool-btn" @click="execCmd('italic')" title="斜体"><i>I</i></button>
      <button class="tool-btn" @click="execCmd('underline')" title="下划线"><u>U</u></button>
      <button class="tool-btn" @click="execCmd('strikeThrough')" title="删除线"><s>S</s></button>

      <span class="toolbar-divider"></span>

      <button class="tool-btn" @click="execCmd('insertUnorderedList')" title="无序列表">•列表</button>
      <button class="tool-btn" @click="execCmd('insertOrderedList')" title="有序列表">1.列表</button>

      <span class="toolbar-divider"></span>

      <!-- 字体大小 -->
      <select class="tool-select" v-model="fontSize" @change="changeFontSize" title="字体大小">
        <option v-for="s in fontSizes" :key="s" :value="s">{{ s }}</option>
      </select>

      <!-- 字体颜色 -->
      <div class="color-picker-wrapper">
        <button class="tool-btn" title="字体颜色" @click="showColorPicker = !showColorPicker">
          <span class="color-icon" :style="{ color: fontColor }">A</span>
        </button>
        <div v-if="showColorPicker" class="color-picker-dropdown">
          <div class="color-grid">
            <div
              v-for="c in colors"
              :key="c"
              class="color-cell"
              :style="{ background: c }"
              @click="setColor(c)"
            ></div>
          </div>
        </div>
      </div>

      <!-- 背景颜色 -->
      <div class="color-picker-wrapper">
        <button class="tool-btn" title="背景高亮" @click="showBgPicker = !showBgPicker">
          <span class="color-icon bg-icon" :style="{ background: bgColor }">A</span>
        </button>
        <div v-if="showBgPicker" class="color-picker-dropdown">
          <div class="color-grid">
            <div
              v-for="c in bgColors"
              :key="c"
              class="color-cell"
              :style="{ background: c }"
              @click="setBgColor(c)"
            ></div>
          </div>
        </div>
      </div>

      <span class="toolbar-divider"></span>

      <!-- 超链接 -->
      <button class="tool-btn" @click="insertLink" title="超链接">🔗</button>
      <!-- 图片 -->
      <button class="tool-btn" @click="insertImage" title="插入图片">🖼️</button>

      <span class="toolbar-divider"></span>

      <!-- 左对齐 / 居中 / 右对齐 -->
      <button class="tool-btn" @click="execCmd('justifyLeft')" title="左对齐">≡</button>
      <button class="tool-btn" @click="execCmd('justifyCenter')" title="居中">≡</button>
      <button class="tool-btn" @click="execCmd('justifyRight')" title="右对齐">≡</button>

      <span class="toolbar-divider"></span>

      <!-- 撤销 / 重做 -->
      <button class="tool-btn" @click="execCmd('undo')" title="撤销">↩</button>
      <button class="tool-btn" @click="execCmd('redo')" title="重做">↪</button>

      <button class="tool-btn" @click="showHTML = !showHTML" :class="{ active: showHTML }" title="查看HTML">&lt;/&gt;</button>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-wrapper" v-show="!showHTML">
      <div
        ref="editor"
        class="editor-content"
        contenteditable="true"
        @input="onEditorInput"
        @paste="onPaste"
        v-html="editorHtml"
      ></div>
    </div>

    <!-- HTML 源码编辑 -->
    <div v-show="showHTML" class="html-editor-wrapper">
      <textarea
        class="html-textarea"
        v-model="rawHtml"
        @input="onRawHtmlInput"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'

export default {
  name: 'ArticleEditor',
  setup() {
    const title = ref('')
    const editorHtml = ref('')
    const rawHtml = ref('')
    const saving = ref(false)
    const isNew = ref(false)
    const showHTML = ref(false)
    const showColorPicker = ref(false)
    const showBgPicker = ref(false)
    const fontColor = ref('#333333')
    const bgColor = ref('transparent')
    const fontSize = ref('16px')
    const editor = ref(null)
    const toolbar = ref(null)
    const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))

    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px']
    const colors = [
      '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
      '#ff0000', '#ff4444', '#ff6666', '#e74c3c', '#c0392b',
      '#ff8c00', '#ffa500', '#ffb347', '#e67e22', '#d35400',
      '#ffff00', '#ffd700', '#f1c40f', '#f39c12',
      '#00ff00', '#2ecc71', '#27ae60', '#1abc9c',
      '#00ffff', '#00bcd4', '#0097a7', '#00838f',
      '#0000ff', '#2196f3', '#1976d2', '#1565c0',
      '#8a2be2', '#9b59b6', '#8e44ad', '#6c3483',
      '#ff69b4', '#e91e63', '#c2185b', '#880e4f'
    ]
    const bgColors = [
      'transparent', '#ffffcc', '#ffcccc', '#ccffcc', '#ccccff',
      '#ffe0cc', '#e0ccff', '#ccffff', '#ffccff', '#ffff99',
      '#ff9999', '#99ff99', '#9999ff', '#ffcc99', '#99ccff'
    ]

    const postId = window.location.pathname.split('/').pop()

    const execCmd = (cmd, value = null) => {
      document.execCommand(cmd, false, value)
      editor.value?.focus()
    }

    const changeFontSize = () => {
      execCmd('fontSize', '7')
      // execCommand fontSize doesn't work well with custom sizes, use inline style
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      const range = selection.getRangeAt(0)
      if (range.collapsed) return
      const span = document.createElement('span')
      span.style.fontSize = fontSize.value
      span.appendChild(range.extractContents())
      range.insertNode(span)
      // Collapse selection to end
      range.setEndAfter(span)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
      updateContent()
    }

    const setColor = (color) => {
      fontColor.value = color
      execCmd('foreColor', color)
      showColorPicker.value = false
    }

    const setBgColor = (color) => {
      bgColor.value = color
      if (color === 'transparent') {
        execCmd('removeFormat')
      } else {
        execCmd('hiliteColor', color)
      }
      showBgPicker.value = false
    }

    const insertLink = () => {
      const url = prompt('请输入链接地址：', 'https://')
      if (url && url.trim()) {
        execCmd('createLink', url.trim())
      }
    }

    const insertImage = () => {
      const url = prompt('请输入图片地址：', 'https://')
      if (url && url.trim()) {
        execCmd('insertImage', url.trim())
      }
    }

    const onEditorInput = () => {
      updateContent()
    }

    const onPaste = (e) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }

    const updateContent = () => {
      if (editor.value) {
        const html = editor.value.innerHTML
        rawHtml.value = html
        editorHtml.value = html
      }
    }

    const onRawHtmlInput = () => {
      editorHtml.value = rawHtml.value
    }

    // 点击外边关闭颜色选择器
    const handleClickOutside = (e) => {
      if (toolbar.value && !toolbar.value.contains(e.target)) {
        showColorPicker.value = false
        showBgPicker.value = false
      }
    }

    const fetchPost = async () => {
      try {
        const res = await axios.get('/api/posts/' + postId, { timeout: 10000 })
        if (res.data.success) {
          const post = res.data.data
          title.value = post.title
          // Convert newlines to <br> for contenteditable
          const content = (post.content || '').replace(/\n/g, '<br>')
          editorHtml.value = content
          rawHtml.value = content
        }
      } catch (err) {
        console.error(err)
        alert('无法加载文章')
      }
    }

    const savePost = async () => {
      if (!title.value.trim()) {
        alert('请输入文章标题')
        return
      }

      // Get content from editor
      let content = ''
      if (showHTML.value) {
        content = rawHtml.value
      } else if (editor.value) {
        content = editor.value.innerHTML
      }
      content = content.trim()

      if (!content || content === '<br>') {
        alert('请输入文章内容')
        return
      }

      saving.value = true
      try {
        const currentUserData = JSON.parse(localStorage.getItem('user') || '{}')
        await axios.put('/api/posts/' + postId, {
          title: title.value,
          content: content,
          author: currentUserData.username
        }, { timeout: 10000 })
        alert('保存成功！')
        window.location.href = '/home/articles/' + postId
      } catch (err) {
        alert('保存失败，请重试')
      } finally {
        saving.value = false
      }
    }

    const goBack = () => {
      window.location.href = '/home/articles'
    }

    onMounted(() => {
      fetchPost()
      document.addEventListener('click', handleClickOutside)
    })

    return {
      title, editorHtml, rawHtml, saving, isNew, showHTML,
      showColorPicker, showBgPicker, fontColor, bgColor, fontSize,
      editor, toolbar, fontSizes, colors, bgColors,
      execCmd, changeFontSize, setColor, setBgColor,
      insertLink, insertImage, onEditorInput, onPaste,
      onRawHtmlInput, savePost, goBack
    }
  }
}
</script>

<style scoped>
.editor-page {
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  position: sticky;
  top: 0;
  z-index: 20;
}

.page-header h2 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--bg-hover);
}

.save-btn {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.4);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.title-section {
  padding: 16px 16px 8px;
}

.title-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  background: transparent;
  padding: 8px 0;
  font-family: inherit;
  box-sizing: border-box;
}

.title-input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

/* 工具栏 */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 53px;
  z-index: 15;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  user-select: none;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.tool-btn:hover {
  background: var(--bg-hover);
}

.tool-btn.active {
  background: var(--bg-active);
  color: var(--color-primary);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.tool-select {
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12px;
  padding: 0 4px;
  outline: none;
  cursor: pointer;
}

.color-picker-wrapper {
  position: relative;
}

.color-icon {
  display: inline-block;
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
}

.bg-icon {
  padding: 0 2px;
  border-radius: 2px;
}

.color-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  width: 200px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.color-cell {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: all 0.15s;
}

.color-cell:hover {
  border-color: var(--color-primary);
  transform: scale(1.15);
}

/* 编辑区域 */
.editor-wrapper {
  flex: 1;
  padding: 16px;
  background: var(--bg-primary);
}

.editor-content {
  min-height: 400px;
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  padding: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1.5px solid var(--border-color);
  transition: border-color 0.2s;
}

.editor-content:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
}

.editor-content:empty:before {
  content: '开始撰写文章内容...';
  color: var(--text-muted);
  pointer-events: none;
}

/* HTML 源码编辑 */
.html-editor-wrapper {
  flex: 1;
  padding: 16px;
}

.html-textarea {
  width: 100%;
  min-height: 400px;
  padding: 16px;
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  background: var(--bg-input);
  color: var(--text-primary);
  box-sizing: border-box;
}

.html-textarea:focus {
  border-color: var(--color-primary);
}
</style>
