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
      <h2>{{ $t('security_title') }}</h2>
    </div>

    <!-- 实名认证 -->
    <div class="section-card">
      <div class="section-title">
        <span class="section-icon">🆔</span>
        <span>{{ $t('security_realname_auth') }}</span>
        <span v-if="authStatus === 'verified'" class="badge badge-success">{{ $t('security_verified') }}</span>
        <span v-else-if="authStatus === 'pending'" class="badge badge-warning">{{ $t('security_pending') }}</span>
        <span v-else class="badge badge-danger">{{ $t('security_unverified') }}</span>
      </div>

      <div class="form-group">
        <label>{{ $t('security_realname') }}</label>
        <input type="text" v-model="form.realName" :placeholder="$t('security_realname_placeholder')" :disabled="authStatus === 'verified'" maxlength="30" />
      </div>
      <div class="form-group">
        <label>{{ $t('security_idcard') }}</label>
        <input type="text" v-model="form.idCard" :placeholder="$t('security_idcard_placeholder')" :disabled="authStatus === 'verified'" maxlength="18" />
      </div>

      <!-- 身份证正反面 -->
      <div class="form-group">
        <label>{{ $t('security_idcard_front') }}</label>
        <div class="upload-box" @click="triggerUpload('idFront')">
          <img v-if="form.idCardFront" :src="form.idCardFront" class="upload-preview" />
          <span v-else class="upload-placeholder">+</span>
        </div>
        <input ref="idFrontInput" type="file" accept="image/*" style="display:none" @change="onUploadIdCard('front', $event)" />
      </div>
      <div class="form-group">
        <label>{{ $t('security_idcard_back') }}</label>
        <div class="upload-box" @click="triggerUpload('idBack')">
          <img v-if="form.idCardBack" :src="form.idCardBack" class="upload-preview" />
          <span v-else class="upload-placeholder">+</span>
        </div>
        <input ref="idBackInput" type="file" accept="image/*" style="display:none" @change="onUploadIdCard('back', $event)" />
      </div>

      <button
        v-if="authStatus !== 'verified'"
        class="submit-btn"
        @click="submitAuth"
        :disabled="submitting"
      >
        {{ submitting ? $t('loading') : $t('security_submit_auth') }}
      </button>
    </div>

    <!-- 修改密码 -->
    <div class="section-card">
      <div class="section-title">
        <span class="section-icon">🔑</span>
        <span>{{ $t('security_change_password') }}</span>
      </div>

      <div class="form-group">
        <label>{{ $t('security_old_password') }}</label>
        <input type="password" v-model="passwordForm.oldPassword" :placeholder="$t('security_old_password_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('security_new_password') }}</label>
        <input type="password" v-model="passwordForm.newPassword" :placeholder="$t('security_new_password_placeholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('security_confirm_password') }}</label>
        <input type="password" v-model="passwordForm.confirmPassword" :placeholder="$t('security_confirm_password_placeholder')" />
      </div>

      <button class="submit-btn" @click="changePassword" :disabled="changingPwd">
        {{ changingPwd ? $t('loading') : $t('security_update_password') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'SecuritySettings',
  setup() {
    const showToast = ref(false)
    const toastMessage = ref('')
    const submitting = ref(false)
    const changingPwd = ref(false)
    const authStatus = ref('unverified') // unverified | pending | verified
    const idFrontInput = ref(null)
    const idBackInput = ref(null)

    const form = ref({
      realName: '',
      idCard: '',
      idCardFront: '',
      idCardBack: ''
    })

    const passwordForm = ref({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    const goBack = () => {
      window.location.href = '/home/settings'
    }

    const showToastMsg = (msg) => {
      toastMessage.value = msg
      showToast.value = true
      setTimeout(() => { showToast.value = false }, 2000)
    }

    const triggerUpload = (side) => {
      if (side === 'front') idFrontInput.value?.click()
      else idBackInput.value?.click()
    }

    const onUploadIdCard = async (side, e) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        alert('图片不能超过 5MB')
        e.target.value = ''
        return
      }
      try {
        const formData = new FormData()
        formData.append('image', file)
        const res = await axios.post('/api/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000
        })
        if (res.data.success) {
          if (side === 'front') form.value.idCardFront = res.data.data.url
          else form.value.idCardBack = res.data.data.url
        } else {
          alert('上传失败：' + (res.data.message || '未知错误'))
        }
      } catch (err) {
        console.error('上传失败:', err)
        alert('图片上传失败，请检查网络连接')
      }
      e.target.value = ''
    }

    // 身份证校验
    const isValidIdCard = (id) => {
      return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(id)
    }

    const submitAuth = async () => {
      if (!form.value.realName.trim()) {
        alert('请输入真实姓名')
        return
      }
      if (!form.value.idCard.trim()) {
        alert('请输入身份证号')
        return
      }
      if (!isValidIdCard(form.value.idCard)) {
        alert('请输入有效的身份证号码')
        return
      }
      if (!form.value.idCardFront) {
        alert('请上传身份证正面照')
        return
      }
      if (!form.value.idCardBack) {
        alert('请上传身份证背面照')
        return
      }

      submitting.value = true
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const res = await axios.post('/api/user/auth', {
          userId: user.id,
          realName: form.value.realName.trim(),
          idCard: form.value.idCard.trim(),
          idCardFront: form.value.idCardFront,
          idCardBack: form.value.idCardBack
        }, { timeout: 10000 })
        if (res.data.success) {
          authStatus.value = 'pending'
          localStorage.setItem('authStatus', 'pending')
          showToastMsg('实名认证信息已提交，等待审核')
        } else {
          alert(res.data.message || '提交失败，请重试')
        }
      } catch (err) {
        console.error('提交认证失败:', err)
        alert('提交失败，请检查网络连接')
      } finally {
        submitting.value = false
      }
    }

    const changePassword = async () => {
      const { oldPassword, newPassword, confirmPassword } = passwordForm.value
      if (!oldPassword) { alert('请输入旧密码'); return }
      if (!newPassword) { alert('请输入新密码'); return }
      if (newPassword.length < 6) { alert('新密码至少需要 6 位'); return }
      if (newPassword !== confirmPassword) { alert('两次输入的新密码不一致'); return }

      changingPwd.value = true
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const res = await axios.post('/api/user/change-password', {
          userId: user.id,
          oldPassword,
          newPassword
        }, { timeout: 10000 })
        if (res.data.success) {
          showToastMsg('密码修改成功')
          passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
        } else {
          alert(res.data.message || '密码修改失败')
        }
      } catch (err) {
        console.error('修改密码失败:', err)
        alert('修改密码失败，请检查网络连接')
      } finally {
        changingPwd.value = false
      }
    }

    // 加载已有认证信息
    onMounted(async () => {
      const savedStatus = localStorage.getItem('authStatus')
      if (savedStatus) authStatus.value = savedStatus

      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user.id) {
          const res = await axios.get('/api/user/auth/' + user.id, { timeout: 10000 })
          if (res.data.success && res.data.data) {
            const data = res.data.data
            form.value.realName = data.realName || ''
            form.value.idCard = data.idCard || ''
            form.value.idCardFront = data.idCardFront || ''
            form.value.idCardBack = data.idCardBack || ''
            if (data.status) authStatus.value = data.status
          }
        }
      } catch (err) {
        console.error('加载认证信息失败:', err)
      }
    })

    return {
      showToast, toastMessage, submitting, changingPwd, authStatus,
      form, passwordForm, idFrontInput, idBackInput,
      goBack, triggerUpload, onUploadIdCard, submitAuth, changePassword
    }
  }
}
</script>

<style scoped>
.tab-page { max-width: 600px; margin: 0 auto; padding-bottom: 40px; }
.page-header {
  position: sticky; top: 0; z-index: 10; background: var(--bg-primary);
  padding: 16px 0; margin-bottom: 12px; display: flex; align-items: center; gap: 12px;
}
.back-btn {
  background: none; border: none; font-size: 24px; color: var(--color-primary);
  cursor: pointer; padding: 0; font-weight: 500;
}
.page-header h2 { font-size: 22px; color: var(--text-primary); flex: 1; }

.section-card {
  background: var(--bg-card); border-radius: 14px; padding: 20px;
  box-shadow: var(--shadow-sm); margin-bottom: 16px;
}
.section-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 17px; font-weight: 600; color: var(--text-primary);
  margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light);
}
.section-icon { font-size: 22px; }

.badge {
  font-size: 11px; padding: 2px 10px; border-radius: 20px;
  font-weight: 600; margin-left: auto;
}
.badge-success { background: #d4edda; color: #155724; }
.badge-warning { background: #fff3cd; color: #856404; }
.badge-danger { background: #f8d7da; color: #721c24; }

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block; font-size: 14px; font-weight: 500; color: var(--text-primary);
  margin-bottom: 6px;
}
.form-group input {
  width: 100%; padding: 12px 14px; border: 1px solid var(--border-light);
  border-radius: 10px; font-size: 15px; background: var(--bg-primary);
  color: var(--text-primary); box-sizing: border-box;
  transition: border-color 0.2s;
}
.form-group input:focus { outline: none; border-color: var(--color-primary); }
.form-group input:disabled { opacity: 0.6; cursor: not-allowed; }

.upload-box {
  width: 100%; height: 140px; border: 2px dashed var(--border-light);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; overflow: hidden; transition: border-color 0.2s;
  background: var(--bg-primary);
}
.upload-box:hover { border-color: var(--color-primary); }
.upload-placeholder {
  font-size: 36px; color: var(--text-light); font-weight: 300;
}
.upload-preview {
  width: 100%; height: 100%; object-fit: cover;
}

.submit-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2); color: white;
  font-size: 16px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s; margin-top: 4px;
}
.submit-btn:hover { opacity: 0.9; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.toast-bar {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  background: #28a745; color: white; padding: 12px 24px;
  border-radius: 30px; font-size: 15px; font-weight: 500;
  z-index: 9999; box-shadow: 0 4px 20px rgba(40,167,69,0.3);
  display: flex; align-items: center; gap: 8px;
}
.toast-icon { font-size: 18px; }

.toast-enter-active { animation: toastIn 0.3s ease; }
.toast-leave-active { animation: toastOut 0.3s ease; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
</style>
