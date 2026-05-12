// 网络状态监听器
let isOnline = navigator.onLine
let listeners = []

export function getOnlineStatus() {
  return isOnline
}

export function onNetworkChange(callback) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter(l => l !== callback)
  }
}

function notifyAll() {
  listeners.forEach(fn => fn(isOnline))
}

// 监听网络变化
window.addEventListener('online', () => {
  isOnline = true
  notifyAll()
})

window.addEventListener('offline', () => {
  isOnline = false
  notifyAll()
})

// 创建全局遮罩
let overlayEl = null
let toastEl = null

export function showOfflineOverlay() {
  if (overlayEl) return
  overlayEl = document.createElement('div')
  overlayEl.id = 'offline-overlay'
  overlayEl.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `
  toastEl = document.createElement('div')
  toastEl.style.cssText = `
    border-radius: 20px; padding: 40px 32px;
    text-align: center; max-width: 320px; width: 85%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: modalIn 0.25s ease;
    background: var(--bg-card, #ffffff);
    color: var(--text-primary, #333333);
  `
  // 读取当前主题背景色
  const bgCard = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff'
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#333333'
  const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#666666'
  const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#999999'
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e5e7eb'

  toastEl.style.background = bgCard
  toastEl.style.color = textPrimary

  toastEl.innerHTML = `
    <div style="font-size: 56px; margin-bottom: 12px;">🌐</div>
    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: ${textPrimary};">无网络服务</h3>
    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 24px; color: ${textSecondary};">网络连接已断开，请检查网络设置后重试</p>
    <div style="width: 36px; height: 36px; border: 3px solid ${borderColor}; border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
    <p style="font-size: 12px; margin-top: 12px; color: ${textMuted};">正在检测网络...</p>
    <style>
      @keyframes modalIn { from { transform: scale(0.9); opacity:0 } to { transform: scale(1); opacity:1 } }
      @keyframes spin { to { transform: rotate(360deg) } }
    </style>
  `
  overlayEl.appendChild(toastEl)
  document.body.appendChild(overlayEl)
}

export function hideOfflineOverlay() {
  if (overlayEl) {
    overlayEl.remove()
    overlayEl = null
    toastEl = null
  }
}

// 初始化网络监听
export function initNetworkMonitor() {
  if (!navigator.onLine) {
    showOfflineOverlay()
  }
  window.addEventListener('online', () => {
    hideOfflineOverlay()
    // 刷新当前页面
    window.location.reload()
  })
  window.addEventListener('offline', () => {
    showOfflineOverlay()
  })
}
