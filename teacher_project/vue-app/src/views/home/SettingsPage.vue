<template>
  <div class="settings-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <h2>{{ $t('settings_title') }}</h2>
      <span v-if="isAdmin" class="admin-badge">{{ $t('admin_badge') }}</span>
    </div>

    <div class="tab-list">
      <div class="tab-item" @click="$router.push('/home/settings/profile')">
        <span class="tab-icon">👤</span>
        <span class="tab-text">{{ $t('settings_profile') }}</span>
        <span class="tab-arrow">›</span>
      </div>
      <div class="tab-item" @click="$router.push('/home/settings/theme')">
        <span class="tab-icon">🎨</span>
        <span class="tab-text">{{ $t('profile_display_mode') }}</span>
        <span class="tab-arrow">›</span>
      </div>
      <div class="tab-item" @click="$router.push('/home/settings/lang')">
        <span class="tab-icon">🌐</span>
        <span class="tab-text">{{ $t('profile_language') }}</span>
        <span class="tab-arrow">›</span>
      </div>
      <div class="tab-item" @click="$router.push('/home/settings/security')">
        <span class="tab-icon">🔒</span>
        <span class="tab-text">{{ $t('security_title') }}</span>
        <span class="tab-arrow">›</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'SettingsPage',
  setup() {
    const isAdmin = ref(localStorage.getItem('isAdmin') === 'true')
    const goBack = () => { window.location.href = '/home/profile' }
    return { isAdmin, goBack }
  }
}
</script>

<style scoped>
.settings-page { max-width: 600px; margin: 0 auto; }
.page-header {
  position: sticky; top: 0; z-index: 10; background: var(--bg-primary);
  padding: 16px 0; margin-bottom: 12px; display: flex; align-items: center; gap: 12px;
}
.back-btn { background: none; border: none; font-size: 24px; color: var(--color-primary); cursor: pointer; padding: 0; font-weight: 500; }
.page-header h2 { font-size: 22px; color: var(--text-primary); flex: 1; }
.admin-badge {
  font-size: 11px; background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white; padding: 2px 10px; border-radius: 20px; font-weight: 600;
}
.tab-list { display: flex; flex-direction: column; gap: 12px; }
.tab-item {
  background: var(--bg-card); border-radius: 14px; padding: 18px 20px;
  display: flex; align-items: center; gap: 14px; cursor: pointer;
  box-shadow: var(--shadow-sm); transition: all 0.2s;
}
.tab-item:hover { transform: translateY(-1px); }
.tab-icon { font-size: 26px; }
.tab-text { flex: 1; font-size: 16px; font-weight: 500; color: var(--text-primary); }
.tab-arrow { font-size: 22px; color: var(--text-light); font-weight: 300; }
</style>
