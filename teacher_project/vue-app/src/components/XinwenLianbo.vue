<template>
  <div class="xwlb-section">
    <div class="xwlb-header">
      <div class="xwlb-title">
        <span class="xwlb-icon">📺</span>
        <span>新闻联播</span>
      </div>
      <div class="xwlb-date-picker">
        <button class="date-btn" @click="changeDate(-1)">‹</button>
        <input
          type="date"
          class="date-input"
          :value="displayDate"
          :max="maxDate"
          @change="onDateChange"
        />
        <button class="date-btn" @click="changeDate(1)" :disabled="isToday">›</button>
      </div>
    </div>

    <div v-if="loading" class="xwlb-loading">{{ $t('loading') }}</div>

    <div v-else-if="error" class="xwlb-error">{{ error }}</div>

    <template v-else-if="data">
      <!-- 完整版新闻联播 -->
      <div v-if="data.fullEpisode" class="xwlb-main-card" @click="playVideo(data.fullEpisode)">
        <div class="xwlb-main-play">▶</div>
        <div class="xwlb-main-info">
          <div class="xwlb-main-title">{{ data.fullEpisode.title || '完整版《新闻联播》' }}</div>
          <div class="xwlb-main-date">{{ formatDisplayDate(data.date) }}</div>
        </div>
      </div>

      <!-- 分段新闻列表 -->
      <div v-if="data.clips && data.clips.length > 0" class="xwlb-clips">
        <div class="xwlb-clips-title">分段新闻</div>
        <div
          class="xwlb-clip-item"
          v-for="(item, index) in data.clips"
          :key="index"
          @click="playVideo(item)"
        >
          <span class="xwlb-clip-num">{{ index + 1 }}</span>
          <span class="xwlb-clip-text">{{ item.title }}</span>
          <span class="xwlb-clip-play">▶</span>
        </div>
      </div>
    </template>

    <div v-else class="xwlb-empty">暂无新闻联播数据</div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'XinwenLianbo',
  setup() {
    const data = ref(null)
    const loading = ref(true)
    const error = ref('')
    const selectedDate = ref('')

    const today = new Date()
    const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const isToday = computed(() => {
      return selectedDate.value === formatDateStr(today)
    })

    const displayDate = computed(() => {
      if (!selectedDate.value) return maxDate
      return selectedDate.value
    })

    function formatDateStr(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    function toApiDate(dateStr) {
      return dateStr.replace(/-/g, '')
    }

    function formatDisplayDate(dateStr) {
      if (!dateStr) return ''
      const y = dateStr.substring(0, 4)
      const m = dateStr.substring(4, 6)
      const d = dateStr.substring(6, 8)
      return `${y}年${m}月${d}日`
    }

    const fetchXwlb = async () => {
      loading.value = true
      error.value = ''
      try {
        const apiDate = toApiDate(selectedDate.value || maxDate)
        const res = await axios.get('/api/news/xwlb?date=' + apiDate, { timeout: 15000 })
        if (res.data.success) {
          data.value = res.data.data
        } else {
          error.value = '获取新闻联播失败'
        }
      } catch (err) {
        console.error('获取新闻联播失败:', err)
        error.value = '获取新闻联播失败，请检查网络连接'
      } finally {
        loading.value = false
      }
    }

    const changeDate = (offset) => {
      const d = new Date(selectedDate.value || maxDate)
      d.setDate(d.getDate() + offset)
      if (d > today) d.setTime(today.getTime())
      selectedDate.value = formatDateStr(d)
      fetchXwlb()
    }

    const onDateChange = (e) => {
      selectedDate.value = e.target.value
      fetchXwlb()
    }

    const playVideo = (item) => {
      if (item && item.url) {
        // 从URL中提取VIDE ID作为新闻ID
        const vidMatch = item.url.match(/VIDE\w+/)
        if (vidMatch) {
          // 使用videoId作为新闻ID跳转到详情页
          window.location.href = '/home/news/' + vidMatch[0]
        } else {
          // 兜底在新窗口打开
          window.open(item.url, '_blank')
        }
      }
    }

    onMounted(fetchXwlb)

    return { data, loading, error, selectedDate, maxDate, isToday, displayDate, changeDate, onDateChange, formatDisplayDate, playVideo }
  }
}
</script>

<style scoped>
.xwlb-section {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.xwlb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.xwlb-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.xwlb-icon {
  font-size: 20px;
}

.xwlb-date-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.date-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.date-input {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 13px;
  background: var(--bg-input);
  color: var(--text-primary);
  width: 130px;
  text-align: center;
}

.xwlb-loading, .xwlb-error, .xwlb-empty {
  text-align: center;
  padding: 30px;
  color: var(--text-light);
  font-size: 14px;
}

.xwlb-error {
  color: #e74c3c;
}

/* 完整版卡片 */
.xwlb-main-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.xwlb-main-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.xwlb-main-play {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.3);
}

.xwlb-main-info {
  flex: 1;
  min-width: 0;
}

.xwlb-main-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xwlb-main-date {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
}

/* 分段新闻 */
.xwlb-clips-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.xwlb-clip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--border-light);
}

.xwlb-clip-item:last-child {
  border-bottom: none;
}

.xwlb-clip-item:hover {
  background: var(--bg-hover);
}

.xwlb-clip-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.xwlb-clip-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.xwlb-clip-play {
  font-size: 12px;
  color: var(--text-light);
  flex-shrink: 0;
}
</style>
