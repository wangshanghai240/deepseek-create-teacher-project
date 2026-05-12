<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="title">{{ $t('app_title') }}</h1>
      <p class="subtitle">{{ isAdminMode ? $t('login_admin_title') : $t('login_title') }}</p>

      <!-- 切换模式 -->
      <div class="mode-switch">
        <span
          class="mode-option"
          :class="{ active: !isAdminMode }"
          @click="isAdminMode = false"
        >{{ $t('login_teacher') }}</span>
        <span class="mode-sep">|</span>
        <span
          class="mode-option"
          :class="{ active: isAdminMode }"
          @click="isAdminMode = true"
        >{{ $t('login_admin') }}</span>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username" class="input-label">
            {{ isAdminMode ? $t('login_admin_account') : $t('login_username') }}
          </label>
          <input
            id="username"
            type="text"
            v-model="formData.username"
            :placeholder="isAdminMode ? $t('login_admin_placeholder') : $t('login_username_placeholder')"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label for="password" class="input-label">{{ $t('login_password') }}</label>
          <input
            id="password"
            type="password"
            v-model="formData.password"
            :placeholder="$t('login_password_placeholder')"
            class="input-field"
          />
        </div>

        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? $t('loading') : (isAdminMode ? $t('login_admin_btn') : $t('login_btn')) }}
        </button>
      </form>

      <p class="register-link">
        <template v-if="isAdminMode">
          {{ $t('login_admin_hint') }}
        </template>
        <template v-else>
          {{ $t('login_no_account') }}<router-link to="/register">{{ $t('login_register_now') }}</router-link>
        </template>
      </p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'
import { t as $t } from '../i18n'

export default {
  setup() {
    const formData = ref({
      username: '',
      password: ''
    })

    const loading = ref(false)
    const isAdminMode = ref(false)

    const handleLogin = async () => {
      if (!formData.value.username.trim()) {
        alert($t('reg_username_required'))
        return
      }
      
      if (formData.value.username.length < 3) {
        alert($t('reg_username_min'))
        return
      }

      if (!formData.value.password) {
        alert($t('reg_password_required'))
        return
      }
      
      if (formData.value.password.length < 6) {
        alert($t('reg_password_min'))
        return
      }

      loading.value = true

      try {
        const url = isAdminMode.value ? '/api/admin/login' : '/api/login'
        const response = await axios.post(url, formData.value, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        })

        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data.data || {}))
          localStorage.setItem('token', response.data.token || '')
          if (response.data.data.isAdmin) {
            localStorage.setItem('isAdmin', 'true')
          }
          window.location.href = '/home'
        } else {
          alert(response.data.message || '登录失败')
        }
      } catch (err) {
        console.error('登录错误:', err)

        if (isAdminMode.value) {
          alert($t('login_admin_error'))
        } else if (err.response && err.response.status === 401) {
          const confirmRegister = confirm($t('login_user_not_found'))
          if (confirmRegister) {
            window.location.href = '/register'
          }
        } else if (err.response && err.response.status === 500) {
          alert($t('register_server_error'))
        } else if (!window.location.hostname.includes('localhost')) {
          alert($t('register_connection_error'))
        } else {
          alert(err.message || '登录失败')
        }
      } finally {
        loading.value = false
      }
    }

    return {
      formData,
      loading,
      isAdminMode,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
}

.login-card {
  background: var(--bg-card);
  border-radius: 16px;
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
  color: var(--color-primary);
  margin-bottom: 4px;
  font-size: 24px;
  font-weight: bold;
}

.subtitle {
  text-align: center;
  color: var(--text-muted);
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 15px;
}

.mode-switch {
  text-align: center;
  margin-bottom: 28px;
  font-size: 14px;
}

.mode-option {
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.mode-option.active {
  color: var(--color-primary);
  font-weight: 600;
}

.mode-sep {
  color: var(--border-color);
  margin: 0 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 300px;
  margin-bottom: 24px;
}

.input-label {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 16px;
  text-align: left;
  width: 100%;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  max-width: 300px;
  height: 50px;
  padding: 0 24px;
  border: none;
  background-color: var(--bg-input);
  border-radius: 6px;
  font-size: 15px;
  text-align: center;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.input-field:focus {
  outline: none;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.input-field::placeholder {
  color: var(--text-light);
}

.login-btn {
  display: block;
  width: 100%;
  max-width: 300px;
  height: 52px;
  margin: 32px auto 0;
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 15px;
}

.register-link a {
  color: var(--color-primary);
  background: var(--color-primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.register-link a:hover {
  opacity: 0.85;
}
</style>
