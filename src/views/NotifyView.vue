<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getSysboxListApi,
  markReadApi,
  markAllReadApi,
  type SysboxMsgItem
} from '../api/sysbox'
import { useSysboxStore } from '../stores/sysbox'
import { formatRFC3339ToLocal } from '../utils/time'

const router = useRouter()
const sysboxStore = useSysboxStore()

// --- 状态管理 ---
const messages = ref<SysboxMsgItem[]>([])
const loading = ref(false)
const marking = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

// Tab 状态
const currentTab = ref('all')

// --- 计算属性：根据 Tab 筛选显示 ---
const filteredMessages = computed(() => {
  const list = messages.value
  if (currentTab.value === 'all') return list

  // 点赞：帖子点赞(1) + 评论点赞(4)
  if (currentTab.value === 'like') {
    return list.filter(m => m.type === 1 || m.type === 4)
  }

  // 关注：被关注(5)
  if (currentTab.value === 'follow') {
    return list.filter(m => m.type === 5)
  }

  // 评论/收藏：评论(3) + 帖子收藏(2)
  if (currentTab.value === 'comment') {
    return list.filter(m => m.type === 3 || m.type === 2)
  }

  // 系统通知：排除上述所有已知类型
  if (currentTab.value === 'system') {
    const knownTypes = [1, 2, 3, 4, 5]
    return list.filter(m => !knownTypes.includes(m.type))
  }

  return list
})

// --- 辅助文本生成 ---
const getActionText = (type: number) => {
  switch (type) {
    case 1: return '赞了你的帖子'
    case 2: return '收藏了你的帖子'
    case 3: return '评论了你的帖子'
    case 4: return '赞了你的评论'
    case 5: return '关注了你'
    default: return '发来一条系统通知'
  }
}

// --- 工具函数 ---
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 259200000) return `${Math.floor(diff / 86400000)}天前`
  const formatted = formatRFC3339ToLocal(timeStr)
  if (!formatted) return ''
  const datePart = formatted.split(' ')[0] || ''
  const parts = datePart.split('-')
  if (parts.length < 3) return ''
  const month = parts[1] || ''
  const day = parts[2] || ''
  return `${Number(month)}月${Number(day)}日`
}

// --- API 交互 ---
const fetchMessages = async (reset = false) => {
  if (reset) {
    page.value = 1
    messages.value = []
    hasMore.value = true
  }

  if (!hasMore.value) return

  loading.value = true
  try {
    const res: any = await getSysboxListApi({
      page: page.value,
      page_size: pageSize
    })

    let list: SysboxMsgItem[] = []

    // 兼容多种返回结构
    if (Array.isArray(res.data)) {
      list = res.data
    } else if (Array.isArray(res.data?.list)) {
      list = res.data.list
    } else if (Array.isArray(res)) {
      list = res
    }

    if (list.length < pageSize) hasMore.value = false

    if (reset) {
      messages.value = list
    } else {
      messages.value = [...messages.value, ...list]
    }
    page.value++
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleMarkAllRead = async () => {
  if (messages.value.length === 0 || messages.value.every(m => m.is_read)) return

  marking.value = true
  try {
    await markAllReadApi()
    ElMessage.success('全部已读')
    messages.value.forEach(m => m.is_read = true)
    sysboxStore.clearCount()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    marking.value = false
  }
}

const handleMsgClick = async (msg: SysboxMsgItem) => {
  // 1. 标记已读
  if (!msg.is_read) {
    try {
      await markReadApi(msg.id) // [Fix]: 加上 await
      msg.is_read = true
      sysboxStore.decreaseCount() // [Fix]: 此方法现已存在
    } catch (e) { console.error(e) }
  }

  // 2. 跳转逻辑 (下划线命名适配)
  if (msg.type === 5 && msg.sender_id) {
    await router.push({ path: '/space', query: { id: msg.sender_id.toString() } }) // [Fix]: 加上 await
  } else if (msg.target_id) {
    await router.push({ path: '/post', query: { id: msg.target_id.toString() } }) // [Fix]: 加上 await
  }
}

onMounted(() => {
  fetchMessages(true)
})
</script>

<template>
  <div class="notify-view">
    <div class="notify-container">

      <header class="notify-header">
        <div class="header-top">
          <div class="title-section">
            <h2>消息通知</h2>
            <span class="unread-badge" v-if="sysboxStore.unreadCount > 0">
              {{ sysboxStore.unreadCount }} 未读
            </span>
          </div>
          <button
              class="mark-all-btn"
              @click="handleMarkAllRead"
              :disabled="marking || messages.length === 0"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            一键已读
          </button>
        </div>

        <div class="header-tabs">
          <div class="tab-item" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">全部</div>
          <div class="tab-item" :class="{ active: currentTab === 'like' }" @click="currentTab = 'like'">点赞</div>
          <div class="tab-item" :class="{ active: currentTab === 'comment' }" @click="currentTab = 'comment'">评论/收藏</div>
          <div class="tab-item" :class="{ active: currentTab === 'follow' }" @click="currentTab = 'follow'">关注</div>
          <div class="tab-item" :class="{ active: currentTab === 'system' }" @click="currentTab = 'system'">系统通知</div>
        </div>
      </header>

      <div class="msg-content-area">
        <div v-if="loading && messages.length === 0" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="filteredMessages.length > 0">
          <TransitionGroup name="list" tag="div" class="msg-list">
            <div
                v-for="msg in filteredMessages"
                :key="msg.id"
                class="msg-card"
                :class="{ 'is-unread': !msg.is_read }"
                @click="handleMsgClick(msg)"
            >
              <div class="card-left">
                <div class="avatar-box">
                  <img :src="msg.avatar_url || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" alt="avatar" class="avatar" />

                  <div class="type-badge like" v-if="msg.type === 1 || msg.type === 4">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </div>
                  <div class="type-badge follow" v-else-if="msg.type === 5">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  </div>
                  <div class="type-badge comment" v-else-if="msg.type === 3">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                  </div>
                  <div class="type-badge star" v-else-if="msg.type === 2">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  </div>
                </div>
              </div>

              <div class="card-middle">
                <div class="msg-header">
                  <span class="username">{{ msg.sender_name }}</span>
                  <span class="action-text">{{ getActionText(msg.type) }}</span>
                  <span class="time">{{ formatTime(msg.created_at) }}</span>
                </div>

                <div class="msg-body" v-if="msg.content && msg.type !== 1 && msg.type !== 2 && msg.type !== 5">
                  {{ msg.content }}
                </div>

                <div class="quote-content" v-if="msg.payload?.post_title">
                  <span class="quote-label">原文</span>
                  {{ msg.payload.post_title }}
                </div>
              </div>

              <div class="card-right">
                <div v-if="!msg.is_read" class="unread-dot"></div>
              </div>
            </div>
          </TransitionGroup>

          <div v-if="hasMore" class="load-more">
            <button class="load-btn" @click="fetchMessages(false)" :disabled="loading">
              {{ loading ? '加载中...' : '加载更多' }}
            </button>
          </div>
          <div v-else class="no-more">没有更多消息了</div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-illustration">
            <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
              <circle cx="120" cy="100" r="80" fill="#F7F9FC"/>
              <rect x="85" y="70" width="70" height="50" rx="4" fill="white" stroke="#E3E8F0" stroke-width="2"/>
              <path d="M85 74L120 95L155 74" stroke="#E3E8F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="165" cy="65" r="8" fill="#FF4757" opacity="0.8"/>
              <path d="M165 61V69M161 65H169" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M60 140Q120 160 180 140" stroke="#E3E8F0" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"/>
            </svg>
          </div>
          <h3>暂无{{ currentTab === 'all' ? '' : '此类' }}消息</h3>
          <p>似乎还没有人来过这里，去广场看看吧</p>
          <button class="go-explore-btn" @click="router.push('/')">去探索发现</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式部分保持一致，仅确保 .msg-list 被正确使用 */
.notify-view {
  width: 100%;
  max-width: 840px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.notify-container {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  min-height: 700px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部样式 */
.notify-header {
  padding: 0;
  border-bottom: 1px solid #F0F2F5;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-top {
  padding: 24px 32px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-section h2 {
  font-size: 20px;
  font-weight: 700;
  color: #18191C;
  margin: 0;
}

.unread-badge {
  background: #FF4757;
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 600;
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #E3E5E7;
  padding: 6px 16px;
  border-radius: 20px;
  color: #61666D;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-all-btn:hover:not(:disabled) {
  border-color: #00AEEC;
  color: #00AEEC;
  background: rgba(0, 174, 236, 0.05);
}

.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tabs */
.header-tabs {
  display: flex;
  padding: 0 32px;
  gap: 32px;
}

.tab-item {
  padding: 12px 0;
  font-size: 15px;
  color: #61666D;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  font-weight: 500;
}

.tab-item:hover {
  color: #18191C;
}

.tab-item.active {
  color: #00AEEC;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #00AEEC;
  border-radius: 2px;
}

/* 列表区域 */
.msg-content-area {
  flex: 1;
  background: #fff;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 这里对应 TransitionGroup 的 class="msg-list" */
.msg-list {
  display: flex;
  flex-direction: column;
}

.msg-card {
  display: flex;
  padding: 24px 32px;
  border-bottom: 1px solid #FAFAFA;
  cursor: pointer;
  transition: all 0.2s ease;
}

.msg-card:hover {
  background-color: #F9FAFB;
}

.msg-card.is-unread {
  background-color: #F0F9FF;
}

/* 卡片布局 */
.card-left {
  margin-right: 16px;
  flex-shrink: 0;
}

.avatar-box {
  position: relative;
  width: 48px;
  height: 48px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0,0,0,0.05);
}

.type-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  color: #fff;
}
.type-badge svg { width: 12px; height: 12px; }
.type-badge.like { background-color: #FF4757; }
.type-badge.follow { background-color: #00AEEC; }
.type-badge.comment { background-color: #409EFF; }
.type-badge.star { background-color: #FFB027; }

.card-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.msg-header {
  font-size: 15px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.username {
  font-weight: 700;
  color: #18191C;
  margin-right: 8px;
}

.action-text {
  color: #61666D;
  margin-right: 12px;
}

.time {
  font-size: 12px;
  color: #9499A0;
}

.msg-body {
  font-size: 14px;
  color: #333;
  margin-top: 4px;
}

.quote-content {
  background: #F6F7F8;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #61666D;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quote-label {
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 11px;
}

.card-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 12px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #FF4757;
  border-radius: 50%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #9499A0;
}

.empty-illustration {
  margin-bottom: 24px;
  animation: float 6s ease-in-out infinite;
}

.empty-state h3 {
  font-size: 18px;
  color: #18191C;
  margin-bottom: 8px;
  font-weight: 600;
}

.empty-state p {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 32px;
}

.go-explore-btn {
  padding: 10px 32px;
  background: #00AEEC;
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}

.go-explore-btn:hover {
  background: #009CD6;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 174, 236, 0.4);
}

.load-more {
  padding: 24px 0;
  text-align: center;
}

.load-btn {
  padding: 8px 24px;
  background: #fff;
  border: 1px solid #E3E5E7;
  border-radius: 20px;
  color: #61666D;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-btn:hover:not(:disabled) {
  border-color: #00AEEC;
  color: #00AEEC;
}

.no-more {
  padding: 30px;
  text-align: center;
  color: #C0C4CC;
  font-size: 12px;
}

.loading-state {
  padding: 60px 0;
  display: flex;
  justify-content: center;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #00AEEC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 列表过渡动画 - 现在会生效了，因为 TransitionGroup 包裹了列表 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
