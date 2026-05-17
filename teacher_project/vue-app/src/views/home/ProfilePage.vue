<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="avatar-text" :style="{ background: avatarBg }">
        {{ displayAvatar }}
      </div>
      <h2>{{ userInfo.username || $t('home_user') }}</h2>
      <p>ID: {{ userInfo.id || '-' }}</p>
    </div>

    <div class="profile-card">
      <div class="info-row">
        <span class="label">{{ $t('profile_username') }}</span>
        <span class="value">{{ userInfo.username || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">{{ $t('profile_user_id') }}</span>
        <span class="value">{{ userInfo.id || '-' }}</span>
      </div>
    </div>

    <div class="menu-card">
      <div class="menu-item" @click="goToSettings">
        <span class="menu-icon">⚙️</span>
        <span class="menu-text">{{ $t('profile_settings') }}</span>
        <span class="menu-arrow">›</span>
      </div>
    </div>

    <button class="logout-btn" @click="showLogoutModal = true">{{ $t('profile_logout') }}</button>

    <!-- 退出确认弹窗 -->
    <div v-if="showLogoutModal" class="logout-modal-overlay" @click.self="showLogoutModal = false">
      <div class="logout-modal">
        <h3 class="logout-modal-title">{{ $t('profile_logout_confirm') }}</h3>
        <p class="logout-modal-desc">{{ $t('profile_logout_hint') }}</p>
        <div class="logout-modal-actions">
          <button class="logout-modal-cancel" @click="showLogoutModal = false">{{ $t('cancel') }}</button>
          <button class="logout-modal-confirm" @click="doLogout">{{ $t('confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { t as $t } from '../../i18n'

export default {
  name: 'ProfilePage',
  setup() {
    const userInfo = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const avatarEmoji = ref(localStorage.getItem('avatar') || '')

    const avatarColors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)'
    ]

    const avatarBg = computed(() => {
      return avatarColors[userInfo.value.id % avatarColors.length]
    })

    const displayAvatar = computed(() => {
      return avatarEmoji.value || (userInfo.value.username || 'U').charAt(0).toUpperCase()
    })

    const showLogoutModal = ref(false)

    const doLogout = () => {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('avatar')
      localStorage.removeItem('isAdmin')
      window.location.href = '/'
    }

    const goToSettings = () => {
      window.location.href = '/home/settings'
    }

    return {
      userInfo, avatarEmoji, avatarBg, displayAvatar,
      showLogoutModal, doLogout, goToSettings
    }
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
}

.profile-header {
  text-align: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 20px;
}

.avatar-text {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}

.profile-header h2 {
  font-size: 22px;
  margin-bottom: 4px;
}

.profile-header p {
  font-size: 13px;
  opacity: 0.8;
}

.profile-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: var(--text-muted);
  font-size: 14px;
}

.value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.menu-card {
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.menu-arrow {
  font-size: 22px;
  color: var(--text-light);
  font-weight: 300;
}

.menu-value {
  font-size: 13px;
  color: var(--text-muted);
  margin-right: 8px;
}

/* 主题选择弹窗 */
.theme-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
}

.theme-panel {
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  width: 100%;
  animation: slideUp 0.25s ease;
}

.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-close {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.theme-body {
  padding: 8px 0;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.theme-item:active {
  background: var(--bg-active);
}

.theme-item.active {
  background: var(--bg-primary-light);
}

.theme-item-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.theme-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-item-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.theme-item-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.theme-check {
  color: var(--color-primary);
  font-size: 18px;
  font-weight: bold;
}

/* 退出确认弹窗 */
.logout-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.logout-modal {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 28px 28px 24px;
  width: 320px;
  max-width: 85vw;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.25s ease;
}

.logout-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.logout-modal-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 24px;
  line-height: 1.5;
}

.logout-modal-actions {
  display: flex;
  gap: 12px;
}

.logout-modal-cancel,
.logout-modal-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.logout-modal-cancel {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.logout-modal-cancel:hover {
  background: var(--border-light);
}

.logout-modal-confirm {
  background: #e74c3c;
  color: white;
}

.logout-modal-confirm:hover {
  background: #c0392b;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.logout-btn {
  width: 100%;
  padding: 14px;
  background: var(--bg-card);
  color: #e74c3c;
  border: 1.5px solid #e74c3c;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #e74c3c;
  color: white;
}
</style>
