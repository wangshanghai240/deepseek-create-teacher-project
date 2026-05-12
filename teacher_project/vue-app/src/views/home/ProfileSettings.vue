<template>
  <div class="tab-page">
    <Transition name="toast">
      <div v-if="showToast" class="toast-bar">
        <span class="toast-icon">✅</span>
        {{ toastMessage }}
      </div>
    </Transition>

    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <h2>{{ $t('settings_profile') }}</h2>
    </div>

    <div class="section-card">
      <div class="section-title">
        <span class="section-icon">👤</span>
        <span>{{ $t('settings_profile') }}</span>
      </div>

      <div class="avatar-section">
        <div class="avatar-preview" :style="{ background: avatarColor }">
          {{ avatarEmoji }}
        </div>
        <div class="avatar-selector">
          <label class="avatar-label">{{ $t('settings_avatar') }}</label>
          <div class="avatar-options">
            <span v-for="emoji in avatarList" :key="emoji" class="avatar-option" :class="{ selected: selectedAvatar === emoji }" @click="selectedAvatar = emoji">{{ emoji }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>{{ $t('settings_username') }}</label>
        <input type="text" v-model="form.username" :placeholder="$t('settings_username_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('settings_age') }}</label>
        <input type="number" v-model.number="form.age" :placeholder="$t('settings_age_placeholder')" min="1" max="150" />
      </div>
      <div class="form-group">
        <label>{{ $t('settings_course') }}</label>
        <div class="picker-trigger" @click="showCoursePicker = true">
          <span :class="{ 'placeholder': !form.course }">{{ form.course || $t('settings_course_placeholder') }}</span>
          <span class="picker-arrow">▼</span>
        </div>
      </div>
      <div class="form-group">
        <label>{{ $t('settings_phone') }}</label>
        <input type="text" v-model="form.phone" :placeholder="$t('settings_phone_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('settings_email') }}</label>
        <input type="email" v-model="form.email" :placeholder="$t('settings_email_placeholder')" />
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">
        <span class="section-icon">🔒</span>
        <span>{{ $t('settings_change_password') }}</span>
      </div>
      <div class="form-group">
        <label>{{ $t('settings_old_password') }}</label>
        <input type="password" v-model="passwordForm.oldPassword" :placeholder="$t('settings_old_pwd_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('settings_new_password') }}</label>
        <input type="password" v-model="passwordForm.newPassword" :placeholder="$t('settings_new_pwd_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('settings_confirm_password') }}</label>
        <input type="password" v-model="passwordForm.confirmPassword" :placeholder="$t('settings_confirm_pwd_placeholder')" />
      </div>
    </div>

    <div class="action-btns">
      <button class="save-btn" @click="saveProfile" :disabled="saving">{{ saving ? $t('settings_saving') : $t('settings_save_btn') }}</button>
      <button class="change-pwd-btn" @click="changePassword" :disabled="changingPwd">{{ changingPwd ? $t('settings_changing') : $t('settings_change_pwd_btn') }}</button>
    </div>

    <Teleport to="body">
      <div v-if="showCoursePicker" class="picker-overlay" @click.self="showCoursePicker = false">
        <div class="theme-panel">
          <div class="picker-header">
            <span>{{ $t('settings_course_placeholder') }}</span>
            <button class="picker-done" @click="showCoursePicker = false">{{ $t('done') }}</button>
          </div>
          <div class="picker-body">
            <div v-for="c in courseList" :key="c" class="picker-item" :class="{ active: form.course === c }" @click="form.course = c; showCoursePicker = false">{{ c }}</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'ProfileSettings',
  setup() {
    const userInfo = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const isAdmin = ref(localStorage.getItem('isAdmin') === 'true')
    const showCoursePicker = ref(false)
    const saving = ref(false)
    const changingPwd = ref(false)
    const selectedAvatar = ref(localStorage.getItem('avatar') || '👤')
    const showToast = ref(false)
    const toastMessage = ref('')
    let toastTimer = null

    const avatarList = ['👤', '👨‍🏫', '👩‍🏫', '🧑‍🏫', '👨‍💻', '👩‍💻', '🎓', '📚', '🌟', '🎯']
    const avatarColorsList = ['linear-gradient(135deg, #667eea, #764ba2)','linear-gradient(135deg, #f093fb, #f5576c)','linear-gradient(135deg, #4facfe, #00f2fe)','linear-gradient(135deg, #43e97b, #38f9d7)','linear-gradient(135deg, #fa709a, #fee140)']
    const avatarColor = computed(() => avatarColorsList[userInfo.value.id % avatarColorsList.length])
    const avatarEmoji = computed(() => selectedAvatar.value)
    const courseList = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '信息技术', '科学', '道德与法治']

    const form = reactive({ username: '', age: null, course: '', phone: '', email: '' })
    const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

    const showSuccessToast = (msg) => {
      toastMessage.value = msg; showToast.value = true
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => { showToast.value = false }, 2500)
    }

    onMounted(async () => {
      try {
        if (isAdmin.value) {
          const res = await axios.get('/api/admin/profile', { params: { id: userInfo.value.id }, timeout: 10000 })
          if (res.data.success) { const d = res.data.data; form.username = d.username || ''; form.age = d.age; form.phone = d.phone || ''; form.email = d.email || '' }
        } else {
          const res = await axios.get('/api/teachers', { timeout: 10000 })
          if (res.data.success) {
            const me = res.data.data.find(t => String(t.id) === String(userInfo.value.id))
            if (me) { form.username = me.teacher_name || ''; form.age = me.age; form.course = me.course || ''; form.phone = me.phone || ''; form.email = me.email || '' }
          }
        }
      } catch (err) { console.error('加载数据失败:', err) }
    })

    const goBack = () => { window.location.href = '/home/settings' }

    const saveProfile = async () => {
      saving.value = true
      try {
        if (isAdmin.value) {
          const res = await axios.put('/api/admin/profile', { id: userInfo.value.id, username: form.username || undefined, age: form.age, phone: form.phone, email: form.email }, { timeout: 10000 })
          if (res.data.success) {
            const u = { id: userInfo.value.id, username: res.data.data.username, isAdmin: true }
            localStorage.setItem('user', JSON.stringify(u)); localStorage.setItem('avatar', selectedAvatar.value); userInfo.value = u
            showSuccessToast('保存成功'); setTimeout(() => { window.location.href = '/home/profile' }, 1000)
          }
        } else {
          const res = await axios.put(`/api/teachers/${userInfo.value.id}`, { teacher_name: form.username || undefined, age: form.age, course: form.course, phone: form.phone, email: form.email }, { timeout: 10000 })
          if (res.data.success) {
            const u = { id: userInfo.value.id, username: res.data.data.teacher_name }
            localStorage.setItem('user', JSON.stringify(u)); localStorage.setItem('avatar', selectedAvatar.value); userInfo.value = u
            showSuccessToast('保存成功'); setTimeout(() => { window.location.href = '/home/profile' }, 1000)
          }
        }
      } catch (err) {
        console.error('保存失败:', err)
        if (err.response && err.response.status === 409) { alert('该用户名已被使用') } else { alert('保存失败，请重试') }
      } finally { saving.value = false }
    }

    const changePassword = async () => {
      if (!passwordForm.oldPassword) { alert('请输入当前密码'); return }
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) { alert('新密码至少需要 6 位'); return }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) { alert('两次输入的新密码不一致'); return }
      changingPwd.value = true
      try {
        const url = isAdmin.value ? '/api/admin/password' : `/api/teachers/${userInfo.value.id}/password`
        const body = isAdmin.value ? { id: userInfo.value.id, oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword } : { oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword }
        const res = await axios.put(url, body, { timeout: 10000 })
        if (res.data.success) {
          alert('密码修改成功，请重新登录')
          localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('avatar'); localStorage.removeItem('isAdmin')
          window.location.href = '/'
        }
      } catch (err) {
        console.error('修改密码失败:', err)
        if (err.response && err.response.status === 401) { alert('当前密码错误') } else { alert('修改密码失败，请重试') }
      } finally { changingPwd.value = false }
    }

    return { userInfo, form, passwordForm, saving, changingPwd, avatarList, selectedAvatar, avatarColor, avatarEmoji, courseList, showCoursePicker, showToast, toastMessage, goBack, saveProfile, changePassword }
  }
}
</script>

<style scoped>
.tab-page { max-width: 600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.back-btn { background: none; border: none; font-size: 24px; color: var(--color-primary); cursor: pointer; padding: 0; font-weight: 500; }
.page-header h2 { font-size: 22px; color: var(--text-primary); }
.section-card { background: var(--bg-card); border-radius: 14px; padding: 20px; box-shadow: var(--shadow-sm); margin-bottom: 16px; }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); }
.section-icon { font-size: 20px; }
.avatar-section { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light); }
.avatar-preview { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.avatar-selector { flex: 1; }
.avatar-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
.avatar-options { display: flex; flex-wrap: wrap; gap: 6px; }
.avatar-option { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; background: #f3f4f6; transition: all 0.2s; border: 2px solid transparent; }
.avatar-option:hover { background: #e5e7eb; transform: scale(1.1); }
.avatar-option.selected { border-color: var(--color-primary); background: var(--bg-primary-light); transform: scale(1.15); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-group input, .form-group select { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 14px; transition: all 0.2s; outline: none; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); }
.form-group input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(129,140,248,0.2); }
.picker-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 14px; border: 1.5px solid var(--border-color); border-radius: 10px; font-size: 14px; cursor: pointer; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); }
.picker-trigger .placeholder { color: var(--text-light); }
.picker-arrow { font-size: 10px; color: var(--text-muted); margin-left: 8px; }
.picker-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 2000; }
.theme-panel { background: var(--bg-card); border-radius: 16px 16px 0 0; width: 100%; max-height: 50vh; display: flex; flex-direction: column; animation: slideUp 0.25s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.picker-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-light); font-size: 16px; font-weight: 600; color: var(--text-primary); flex-shrink: 0; }
.picker-done { background: var(--color-primary-gradient); color: white; border: none; padding: 6px 18px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.picker-body { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 8px 0; max-height: 40vh; }
.picker-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; font-size: 16px; color: var(--text-primary); cursor: pointer; transition: background 0.15s; }
.picker-item:active { background: var(--bg-active); }
.picker-item.active { color: var(--color-primary); font-weight: 600; background: var(--bg-primary-light); }
.action-btns { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.save-btn, .change-pwd-btn { width: 100%; padding: 14px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; border: none; }
.save-btn { background: var(--color-primary-gradient); color: white; }
.save-btn:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(102,126,234,0.4); }
.save-btn:disabled, .change-pwd-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.change-pwd-btn { background: var(--bg-card); color: var(--color-primary); border: 1.5px solid var(--color-primary); }
.change-pwd-btn:hover:not(:disabled) { background: var(--bg-primary-light); }
.toast-bar { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--color-success); color: white; padding: 12px 24px; border-radius: 12px; font-size: 15px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 20px rgba(52,211,153,0.35); display: flex; align-items: center; gap: 8px; }
.toast-icon { font-size: 18px; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
</style>
