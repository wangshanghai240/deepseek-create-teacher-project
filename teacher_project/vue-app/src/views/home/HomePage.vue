<template>
  <div class="home-page">
    <div class="welcome-card">
      <h2>{{ $t('home_welcome') }}</h2>
      <p class="username">{{ userInfo.username || $t('home_user') }}</p>
      <p class="desc">{{ $t('home_desc') }}</p>
    </div>

    <div class="quick-actions">
      <div class="action-card" @click="$router.push('/home/articles')">
        <span class="action-icon">📄</span>
        <span class="action-text">{{ $t('home_article_mgmt') }}</span>
      </div>
      <div class="action-card" @click="$router.push('/home/teachers')">
        <span class="action-icon">👨‍🏫</span>
        <span class="action-text">{{ $t('home_teacher_list') }}</span>
      </div>
      <div class="action-card" @click="$router.push('/home/profile')">
        <span class="action-icon">👤</span>
        <span class="action-text">{{ $t('home_profile_center') }}</span>
      </div>
    </div>

    <div class="info-card">
      <h3>{{ $t('home_notice_title') }}</h3>
      <p>{{ $t('home_notice_text') }}</p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'HomePage',
  setup() {
    const userInfo = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    return { userInfo }
  }
}
</script>

<style scoped>
.home-page {
  max-width: 600px;
  margin: 0 auto;
}

.welcome-card {
  background: var(--color-primary-gradient);
  border-radius: 16px;
  padding: 28px 24px;
  color: white;
  margin-bottom: 20px;
}

.welcome-card h2 {
  font-size: 18px;
  margin-bottom: 4px;
  font-weight: 500;
}

.welcome-card .username {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 8px;
}

.welcome-card .desc {
  font-size: 14px;
  opacity: 0.85;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.action-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-icon {
  font-size: 32px;
}

.action-text {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.info-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.info-card h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.info-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
