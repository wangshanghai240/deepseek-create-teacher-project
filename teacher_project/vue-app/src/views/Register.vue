<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">{{ $t('app_title') }}</h1>
      <p class="subtitle">{{ $t('register_title') }}</p>

      <!-- 顶部 Toast 提示 -->
      <Transition name="toast-fade">
        <div v-if="toastMessage" class="toast-bar">
          <span class="toast-icon">⚠️</span>
          {{ toastMessage }}
        </div>
      </Transition>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">{{ $t('register_username') }}</label>
          <input
            id="username"
            type="text"
            v-model="formData.username"
            :placeholder="$t('register_username_placeholder')"
            :class="{ 'is-invalid': errors.username }"
            @blur="checkUsername"
          />
          <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
        </div>

        <div class="form-group">
          <label for="password">{{ $t('register_password') }}</label>
          <input
            id="password"
            type="password"
            v-model="formData.password"
            :placeholder="$t('register_password_placeholder')"
            :class="{ 'is-invalid': errors.password }"
          />
          <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>

        <div class="form-group">
          <label for="confirmPassword">{{ $t('register_confirm_password') }}</label>
          <input
            id="confirmPassword"
            type="password"
            v-model="formData.confirmPassword"
            :placeholder="$t('register_confirm_placeholder')"
            :class="{ 'is-invalid': errors.confirmPassword }"
            @blur="checkPasswordMatch"
          />
          <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
        </div>

        <div class="form-group">
          <label for="phone">{{ $t('register_phone') }}</label>
          <input
            id="phone"
            type="text"
            v-model="formData.phone"
            :placeholder="$t('register_phone_placeholder')"
            :class="{ 'is-invalid': errors.phone }"
            @blur="checkPhone"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>

        <div class="form-group">
          <label for="email">{{ $t('register_email') }}</label>
          <input
            id="email"
            type="email"
            v-model="formData.email"
            :placeholder="$t('register_email_placeholder')"
            :class="{ 'is-invalid': errors.email }"
          />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? $t('register_registering') : $t('register_btn') }}
        </button>
      </form>

      <p class="login-link">
        {{ $t('register_have_account') }}<router-link to="/">{{ $t('register_login_now') }}</router-link>
      </p>
    </div>
  </div>
</template>

<!-- eslint-disable vue/multi-word-component-names -->
<script>
import { ref } from 'vue'
import axios from 'axios'
import { t as $t } from '../i18n'

export default {
  setup() {
    const formData = ref({
      username: '',
      password: '',
      confirmPassword: '',
      phone: '',
      email: ''
    })

    const errors = ref({})
    const loading = ref(false)
    const toastMessage = ref('')
    let toastTimer = null

    const showToast = (msg) => {
      toastMessage.value = msg
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        toastMessage.value = ''
      }, 2000)
    }

    // 用户名失去焦点 — 查重
    let checkTimer = null
    const checkUsername = () => {
      const name = formData.value.username.trim()
      if (!name || name.length < 3) return
      if (checkTimer) clearTimeout(checkTimer)
      checkTimer = setTimeout(async () => {
        try {
          const res = await axios.post('/api/check-username', { username: name }, { timeout: 5000 })
          if (res.data.success && res.data.exists) {
            showToast($t('reg_username_exists_toast'))
            errors.value = { ...errors.value, username: $t('reg_username_exists_toast') }
          } else {
            const { username, ...rest } = errors.value
            errors.value = rest
          }
        } catch (err) {
          // 静默失败
        }
      }, 300)
    }

    // 手机号失去焦点 — 校验
    const checkPhone = () => {
      if (!formData.value.phone) return
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(formData.value.phone)) {
        showToast($t('reg_phone_invalid'))
        errors.value = { ...errors.value, phone: $t('reg_phone_invalid') }
      } else {
        const { phone, ...rest } = errors.value
        errors.value = rest
      }
    }

    // 确认密码失去焦点 — 比对
    const checkPasswordMatch = () => {
      if (!formData.value.confirmPassword) return
      if (formData.value.password !== formData.value.confirmPassword) {
        showToast($t('reg_confirm_mismatch'))
        formData.value.confirmPassword = ''
      }
    }

    // 表单验证
    const validateForm = () => {
      const newErrors = {}

      if (!formData.value.username.trim()) {
        newErrors.username = $t('reg_username_required')
      } else if (formData.value.username.length < 3) {
        newErrors.username = $t('reg_username_min')
      } else if (/^[0-9]+$/.test(formData.value.username)) {
        newErrors.username = $t('reg_username_no_number')
      }

      if (!formData.value.password) {
        newErrors.password = $t('reg_password_required')
      } else if (formData.value.password.length < 6) {
        newErrors.password = $t('reg_password_min')
      }

      if (!formData.value.confirmPassword) {
        newErrors.confirmPassword = $t('reg_confirm_required')
      } else if (formData.value.password !== formData.value.confirmPassword) {
        newErrors.confirmPassword = $t('reg_confirm_mismatch')
      }

      const phoneRegex = /^1[3-9]\d{9}$/
      if (formData.value.phone && !phoneRegex.test(formData.value.phone)) {
        newErrors.phone = $t('reg_phone_invalid')
      }

      if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
        newErrors.email = $t('reg_email_invalid')
      }

      return newErrors
    }

    // 处理注册
    const handleRegister = async () => {
      errors.value = validateForm()

      if (Object.keys(errors.value).length > 0) {
        return
      }

      loading.value = true

      try {
        const response = await axios.post('/api/register', {
          teacher_name: formData.value.username,
          password: formData.value.password,
          phone: formData.value.phone || undefined,
          email: formData.value.email || undefined
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })

        if (response.data.success) {
          showToast($t('register_success'))
          
          // 清除表单数据
          formData.value = {
            username: '',
            password: '',
            confirmPassword: '',
            phone: '',
            email: ''
          }

          // Toast 显示完后跳转到登录页
          setTimeout(() => {
            window.location.href = '/'
          }, 1500)
        } else {
          showToast(response.data.message || $t('register_fail'))
        }
      } catch (err) {
        console.error('注册错误:', err)

        if (err.response && err.response.status === 409) {
          showToast(err.response.data.message || $t('register_username_exists'))
        } else if (err.response && err.response.status === 500) {
          showToast($t('register_server_error'))
        } else if (!window.location.hostname.includes('localhost')) {
          showToast($t('register_connection_error'))
        } else {
          showToast(err.message || $t('register_fail'))
        }
      } finally {
        loading.value = false
      }
    }

    return {
      formData,
      errors,
      loading,
      toastMessage,
      handleRegister,
      checkUsername,
      checkPasswordMatch,
      checkPhone
    }
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
}

.register-card {
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.title {
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: bold;
}

.subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 13px;
}

.form-group {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 300px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 14px;
  text-align: left;
  width: 100%;
}

input[type="text"],
input[type="password"],
input[type="email"] {
  width: 100%;
  height: 46px;
  padding: 12px 16px;
  margin-top: 8px;
  text-align: center;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: var(--bg-input);
  color: var(--text-primary);
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.25);
}

.is-invalid {
  border-color: var(--color-error) !important;
}

.error-text {
  display: block;
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}

button[type="submit"] {
  width: 100%;
  max-width: 300px;
  padding: 12px;
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
}

button[type="submit"]:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

button[type="submit"]:active:not(:disabled) {
  transform: translateY(0);
}

button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  background-color: #fee2e2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  text-align: center;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.login-link a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}

/* Toast 提示 */
.toast-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-warning);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-icon {
  font-size: 18px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>