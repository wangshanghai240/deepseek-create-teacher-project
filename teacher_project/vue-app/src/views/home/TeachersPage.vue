<template>
  <div class="teachers-page">
    <!-- 顶部提示 -->
    <Transition name="toast">
      <div v-if="showToast" class="toast-bar">
        <span class="toast-icon">✅</span>
        {{ toastMessage }}
      </div>
    </Transition>

    <div class="page-header">
      <div class="header-left">
        <h2>{{ $t('teacher_title') }}</h2>
        <p class="page-desc">{{ $t('teacher_count', { count: teachers.length }) }}</p>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <span class="loading-icon">⏳</span>
      <p>{{ $t('loading') }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="teachers.length === 0" class="empty-state">
      <span class="empty-icon">👨‍🏫</span>
      <p>{{ $t('teacher_no_data') }}</p>
    </div>

    <!-- 教师卡片列表 -->
    <div v-else class="teacher-list">
      <div
        v-for="teacher in teachers"
        :key="teacher.id"
        class="teacher-card"
        @click="openEdit(teacher)"
      >
        <div class="card-avatar" :style="{ background: avatarColor(teacher.id) }">
          {{ getAvatar(teacher) }}
        </div>
        <div class="card-info">
          <h3 class="card-name">{{ teacher.teacher_name }}</h3>
          <div class="card-tags">
            <span class="tag tag-age">
              <span class="tag-icon">🎂</span> {{ teacher.age ?? '-' }}{{ $t('teacher_age') }}
            </span>
            <span class="tag tag-course">
              <span class="tag-icon">📖</span> {{ teacher.course || $t('teacher_no_course') }}
            </span>
          </div>
          <div class="card-contact">
            <span v-if="teacher.phone" class="contact-item">📞 {{ teacher.phone }}</span>
            <span v-if="teacher.email" class="contact-item">✉️ {{ teacher.email }}</span>
          </div>
          <p class="card-meta">{{ $t('teacher_registered') }} {{ formatDate(teacher.created_at) }}</p>
        </div>
        <button v-if="isOwnCard(teacher)" class="edit-btn" @click.stop="openEdit(teacher)">
          ✏️
        </button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeEdit">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ $t('teacher_edit_title') }}</h3>
            <button class="modal-close" @click="closeEdit">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-avatar">
              {{ editingTeacher?.teacher_name?.charAt(0).toUpperCase() }}
            </div>
            <p class="modal-name">{{ editingTeacher?.teacher_name }}</p>

            <div class="form-group">
              <label>{{ $t('teacher_age_label') }}</label>
              <input
                type="number"
                v-model.number="editForm.age"
                :placeholder="$t('teacher_age_placeholder')"
                min="1"
                max="150"
              />
            </div>
            <div class="form-group">
              <label>{{ $t('teacher_course_label') }}</label>
              <div class="picker-trigger" @click="showCoursePicker = 'edit'">
                <span :class="{ 'placeholder': !editForm.course }">{{ editForm.course || $t('teacher_course_placeholder') }}</span>
                <span class="picker-arrow">▼</span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ $t('teacher_phone_label') }}</label>
              <input
                type="text"
                v-model="editForm.phone"
                :placeholder="$t('teacher_phone_placeholder')"
              />
            </div>
            <div class="form-group">
              <label>{{ $t('teacher_email_label') }}</label>
              <input
                type="email"
                v-model="editForm.email"
                :placeholder="$t('teacher_email_placeholder')"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeEdit">{{ $t('cancel') }}</button>
            <button class="btn-save" @click="saveEdit" :disabled="saving">
              {{ saving ? $t('loading') : $t('teacher_save_btn') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 非管理员提示弹窗 -->
    <!-- 课程选择面板 -->
    <Teleport to="body">
      <div v-if="showCoursePicker === 'edit'" class="picker-overlay" @click.self="showCoursePicker = null">
        <div class="picker-panel">
          <div class="picker-header">
            <span>{{ $t('teacher_course_placeholder') }}</span>
            <button class="picker-done" @click="showCoursePicker = null">{{ $t('done') }}</button>
          </div>
          <div class="picker-body">
            <div
              v-for="c in courseList"
              :key="c"
              class="picker-item"
              :class="{ active: editForm.course === c }"
              @click="editForm.course = c; showCoursePicker = null"
            >{{ c }}</div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showHintModal" class="modal-overlay" @click.self="closeHint">
        <div class="modal-card hint-card">
          <div class="hint-icon">🚫</div>
          <h3 class="hint-title">{{ $t('teacher_cannot_edit_title') }}</h3>
          <p class="hint-desc">
            {{ $t('teacher_cannot_edit', { name: hintTeacher?.teacher_name }) }}
          </p>
          <p class="hint-note">{{ $t('teacher_admin_only') }}</p>
          <button class="hint-btn" @click="closeHint">{{ $t('know') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, reactive, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'TeachersPage',
  setup() {
    const teachers = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const editingTeacher = ref(null)
    const saving = ref(false)
    const courseList = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '信息技术', '科学', '道德与法治']

    const editForm = reactive({ age: null, course: '', phone: '', email: '' })

    // 当前登录用户信息
    const currentUser = computed(() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}')
      } catch {
        return {}
      }
    })

    const avatarColors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)'
    ]

    const avatarColor = (id) => {
      return avatarColors[id % avatarColors.length]
    }

    const fetchTeachers = async () => {
      try {
        const response = await axios.get('/api/teachers', { timeout: 10000 })
        if (response.data.success) {
          teachers.value = response.data.data
        }
      } catch (err) {
        console.error('获取教师列表失败:', err)
      } finally {
        loading.value = false
      }
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    // 获取教师头像（自己的用 localStorage 中的 emoji，其他用首字母）
    const getAvatar = (teacher) => {
      if (isOwnCard(teacher)) {
        return localStorage.getItem('avatar') || teacher.teacher_name.charAt(0).toUpperCase()
      }
      return teacher.teacher_name.charAt(0).toUpperCase()
    }

    // 判断是否为管理员
    const isAdmin = computed(() => {
      return localStorage.getItem('isAdmin') === 'true'
    })

    // 判断是否为当前登录用户或管理员
    const isOwnCard = (teacher) => {
      if (isAdmin.value) return true
      return String(teacher.id) === String(currentUser.value.id)
    }

    const showCoursePicker = ref(null) // 'edit' 或 null
    const showHintModal = ref(false)
    const hintTeacher = ref(null)

    const openEdit = (teacher) => {
      // 非管理员且不是自己的卡片，弹出提示
      if (!isOwnCard(teacher)) {
        hintTeacher.value = teacher
        showHintModal.value = true
        return
      }
      editingTeacher.value = teacher
      editForm.age = teacher.age
      editForm.course = teacher.course || ''
      editForm.phone = teacher.phone || ''
      editForm.email = teacher.email || ''
      showModal.value = true
    }

    const closeEdit = () => {
      showModal.value = false
      editingTeacher.value = null
    }

    const closeHint = () => {
      showHintModal.value = false
      hintTeacher.value = null
    }

    const toastMessage = ref('')
    const showToast = ref(false)
    let toastTimer = null

    const showSuccessToast = (msg) => {
      toastMessage.value = msg
      showToast.value = true
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        showToast.value = false
      }, 2000)
    }

    const saveEdit = async () => {
      if (!editingTeacher.value) return
      saving.value = true
      try {
        const response = await axios.put(`/api/teachers/${editingTeacher.value.id}`, {
          age: editForm.age,
          course: editForm.course,
          phone: editForm.phone,
          email: editForm.email
        }, { timeout: 10000 })
        if (response.data.success) {
          // 更新本地数据
          const idx = teachers.value.findIndex(t => t.id === editingTeacher.value.id)
          if (idx !== -1) {
            teachers.value[idx] = response.data.data
          }
          closeEdit()
          showSuccessToast('信息更新完毕')
        }
      } catch (err) {
        console.error('保存失败:', err)
        alert('保存失败，请重试')
      } finally {
        saving.value = false
      }
    }

    onMounted(fetchTeachers)

    return {
      teachers, loading, formatDate,
      avatarColor, isOwnCard, isAdmin, getAvatar,
      showModal, editingTeacher, editForm, saving, courseList,
      showCoursePicker,
      showHintModal, hintTeacher,
      openEdit, closeEdit, saveEdit, closeHint,
      showToast, toastMessage
    }
  }
}
</script>

<style scoped>
.teachers-page {
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
  padding: 16px 0 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  font-size: 22px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.page-desc {
  color: var(--text-muted);
  font-size: 13px;
}

.loading-state {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.loading-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.loading-state p {
  color: var(--text-muted);
  font-size: 15px;
}

.empty-state {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--text-muted);
  font-size: 15px;
}

/* 卡片列表 */
.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.teacher-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.teacher-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.tag-age {
  background: var(--bg-primary-light);
  color: var(--color-primary);
}

.tag-course {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}

.tag-icon {
  font-size: 13px;
}

.card-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 2px;
}

.contact-item {
  font-size: 11px;
  color: var(--text-muted);
}

.card-meta {
  font-size: 11px;
  color: var(--text-light);
}

.edit-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-hover);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.edit-btn:hover {
  background: var(--bg-active);
  transform: scale(1.1);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: var(--bg-card);
  border-radius: 20px;
  width: 90%;
  max-width: 380px;
  overflow: hidden;
  animation: modalIn 0.25s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

@keyframes modalIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h3 {
  font-size: 18px;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px 24px;
  text-align: center;
}

.modal-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary-gradient);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

.modal-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
  box-sizing: border-box;
  background: var(--bg-input);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 20px;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-active);
}

.btn-save {
  background: var(--color-primary-gradient);
  color: white;
}

.btn-save:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.4);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 提示弹窗 */
.hint-card {
  text-align: center;
  padding: 40px 32px 32px;
}

.hint-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.hint-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
}

.hint-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 4px;
}

.hint-desc strong {
  color: var(--text-primary);
}

.hint-note {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.hint-btn {
  width: 100%;
  padding: 12px;
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.hint-btn:hover {
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

/* 课程选择器 */
.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  box-sizing: border-box;
  background: var(--bg-input);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.picker-trigger:focus-within {
  border-color: var(--color-primary);
}

.picker-trigger .placeholder {
  color: var(--text-light);
}

.picker-arrow {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 8px;
}

.picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
}

.picker-panel {
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.picker-done {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.picker-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0;
  max-height: 40vh;
}

.picker-item {
  padding: 14px 20px;
  font-size: 16px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.picker-item:active {
  background: var(--bg-active);
}

.picker-item.active {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--bg-primary-light);
}

/* Toast 提示 */
.toast-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-success);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(52, 211, 153, 0.35);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-icon {
  font-size: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
