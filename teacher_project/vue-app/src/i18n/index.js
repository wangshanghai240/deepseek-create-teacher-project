import zh from './zh'
import en from './en'
import fr from './fr'
import es from './es'
import ru from './ru'
import ar from './ar'

const locales = { zh, en, fr, es, ru, ar }

// 支持的语言列表
export const supportedLangs = [
  { value: 'zh', label: '中文', native: '中文' },
  { value: 'en', label: 'English', native: 'English' },
  { value: 'fr', label: 'Français', native: 'Français' },
  { value: 'es', label: 'Español', native: 'Español' },
  { value: 'ru', label: 'Русский', native: 'Русский' },
  { value: 'ar', label: 'العربية', native: 'العربية' }
]

// 获取当前语言
export function getLang() {
  return localStorage.getItem('lang') || 'zh'
}

// 设置语言
export function setLang(lang) {
  localStorage.setItem('lang', lang)
}

// 翻译函数
export function t(key, params = {}) {
  const lang = getLang()
  const messages = locales[lang] || locales.zh
  let text = messages[key]
  if (text === undefined) {
    // 回退到中文
    text = locales.zh[key] || key
  }
  // 替换参数 {name}, {count} 等
  if (params && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

// 初始化语言
export function initI18n() {
  const lang = getLang()
  setLang(lang)
}
