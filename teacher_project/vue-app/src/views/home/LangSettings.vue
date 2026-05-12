<template>
  <div class="tab-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">{{ $t('back') }}</button>
      <h2>{{ $t('profile_language') }}</h2>
    </div>

    <div class="section-card">
      <div
        v-for="lang in langOptions"
        :key="lang.value"
        class="select-item"
        :class="{ active: currentLang === lang.value }"
        @click="switchLang(lang.value)"
      >
        <span class="select-icon">{{ lang.flag }}</span>
        <div class="select-info">
          <span class="select-label">{{ lang.native }}</span>
          <span class="select-desc">{{ lang.localName }}</span>
        </div>
        <span v-if="currentLang === lang.value" class="select-check">✓</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { getLang, setLang } from '../../i18n'

export default {
  name: 'LangSettings',
  setup() {
    const currentLang = ref(getLang())

    const langOptions = [
      { value: 'zh', native: '中文', localName: '中文', flag: '🇨🇳' },
      { value: 'en', native: 'English', localName: 'English', flag: '🇬🇧' },
      { value: 'fr', native: 'Français', localName: 'Français', flag: '🇫🇷' },
      { value: 'es', native: 'Español', localName: 'Español', flag: '🇪🇸' },
      { value: 'ru', native: 'Русский', localName: 'Русский', flag: '🇷🇺' },
      { value: 'ar', native: 'العربية', localName: 'العربية', flag: '🇸🇦' }
    ]

    const switchLang = (lang) => {
      currentLang.value = lang
      setLang(lang)
      window.location.reload()
    }

    const goBack = () => { window.location.href = '/home/settings' }

    return { currentLang, langOptions, switchLang, goBack }
  }
}
</script>

<style scoped>
.tab-page { max-width: 600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.back-btn { background: none; border: none; font-size: 24px; color: var(--color-primary); cursor: pointer; padding: 0; font-weight: 500; }
.page-header h2 { font-size: 22px; color: var(--text-primary); }
.section-card { background: var(--bg-card); border-radius: 14px; padding: 8px 0; box-shadow: var(--shadow-sm); overflow: hidden; }
.select-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid var(--border-light); }
.select-item:last-child { border-bottom: none; }
.select-item:active { background: var(--bg-hover); }
.select-item.active { background: var(--bg-primary-light); }
.select-icon { font-size: 24px; width: 36px; text-align: center; }
.select-info { flex: 1; }
.select-label { display: block; font-size: 15px; font-weight: 500; color: var(--text-primary); }
.select-desc { display: block; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.select-check { color: var(--color-primary); font-size: 18px; font-weight: bold; }
</style>
