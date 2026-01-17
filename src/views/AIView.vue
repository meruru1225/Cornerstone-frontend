<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import {converseAgentApi} from "../api/agent.ts";

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  chatId: string
  title: string
  messages: Message[]
  updatedAt: number
}

const DB_NAME = 'CornerstoneDB'
const STORE_NAME = 'agent_message_history'
const EXPIRE_DAYS = 30

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const userInput = ref('')
const messages = ref<Message[]>([])
const sessions = ref<ChatSession[]>([])
const isFirstMessage = ref(true)
const isStreaming = ref(false)
const chatId = ref("0")
const chatScrollContainer = ref<HTMLElement | null>(null)

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 4)
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'chatId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const loadHistory = async () => {
  try {
    const db = await initDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const now = Date.now()
      const expireTime = EXPIRE_DAYS * 24 * 60 * 60 * 1000
      const validSessions = (request.result || []).filter((s: ChatSession) => {
        if (now - s.updatedAt > expireTime) {
          store.delete(s.chatId)
          return false
        }
        return true
      }).map((s: ChatSession) => {
        if (!s.title) {
          const firstUserMsg = s.messages.find(m => m.role === 'user')?.content || '未命名对话'
          s.title = firstUserMsg.length > 25 ? firstUserMsg.substring(0, 25) + '...' : firstUserMsg
        }
        return s
      })
      sessions.value = validSessions.sort((a, b) => b.updatedAt - a.updatedAt)
    }
  } catch (e) {
    console.error("加载历史记录失败", e)
  }
}

const saveCurrentChat = async () => {
  if (chatId.value === "0" || messages.value.length === 0) return
  const db = await initDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  const firstUserMsg = messages.value.find(m => m.role === 'user')?.content || '新对话'
  const title = firstUserMsg.length > 25 ? firstUserMsg.substring(0, 25) + '...' : firstUserMsg

  const sessionData: ChatSession = {
    chatId: chatId.value,
    title,
    messages: JSON.parse(JSON.stringify(messages.value)),
    updatedAt: Date.now()
  }
  store.put(sessionData)
  await loadHistory()
}

const startNewChat = () => {
  chatId.value = "0"
  messages.value = []
  isFirstMessage.value = false
  userInput.value = ''
}

const goToHome = () => {
  isFirstMessage.value = true
  chatId.value = "0"
  messages.value = []
}

const selectSession = (session: ChatSession) => {
  chatId.value = session.chatId
  messages.value = session.messages
  isFirstMessage.value = false
}

const clearAllHistory = async () => {
  if (!confirm('确定要清空所有本地聊天记录吗？')) return
  const db = await initDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
  sessions.value = []
  goToHome()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

const handleSendMessage = async () => {
  if (!userInput.value.trim() || isStreaming.value) return
  const question = userInput.value.trim()

  if (isFirstMessage.value) isFirstMessage.value = false
  messages.value.push({ role: 'user', content: question })
  userInput.value = ''
  isStreaming.value = true

  messages.value.push({ role: 'assistant', content: '' })
  const assistantMsgIndex = messages.value.length - 1

  await nextTick()
  chatScrollContainer.value?.scrollTo({ top: chatScrollContainer.value.scrollHeight, behavior: 'smooth' })

  let isFirstChunk = true

  try {
    await converseAgentApi(
      { question, chat_id: chatId.value },
      {
        onMessage: (rawLine) => {
          try {
            const data = JSON.parse(rawLine)
            if (data.type === 'chat_id') {
              chatId.value = data.content
            } else if (data.type === 'message') {
              if (isFirstChunk && (data.content === '\n' || data.content === '\\n')) {
                isFirstChunk = false
                return
              }
              isFirstChunk = false
              const target = messages.value[assistantMsgIndex]
              if (target) {
                target.content += data.content
              }
              chatScrollContainer.value?.scrollTo({ top: chatScrollContainer.value.scrollHeight })
            }
          } catch (e) {}
        },
        onFinish: async () => {
          await saveCurrentChat()
        },
        onError: (error) => {
          console.error(error)
          const target = messages.value[assistantMsgIndex]
          if (target) target.content = '服务响应异常，请重试。'
        }
      }
    )
  } catch (error) {
    const target = messages.value[assistantMsgIndex]
    if (target) target.content = '服务响应异常，请重试。'
  } finally {
    isStreaming.value = false
  }
}

onMounted(() => loadHistory())
</script>

<template>
  <div class="ai-view-container" :class="{ 'is-empty': isFirstMessage }">
    <header v-if="!isFirstMessage" class="active-chat-header">
      <div class="header-content">
        <button class="header-btn home-btn" @click="goToHome">
          <svg viewBox="0 0 24 24" width="18">
            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          返回首页
        </button>
        <button class="header-btn primary-btn" @click="startNewChat">
          <svg viewBox="0 0 24 24" width="18">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          开启新对话
        </button>
      </div>
    </header>

    <div class="chat-main-wrapper" ref="chatScrollContainer">
      <div class="chat-content">
        <transition name="fade">
          <div v-if="isFirstMessage" class="welcome-ui">
            <div class="mascot-wrapper">
              <svg class="mascot-svg" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="#E3F6FC"/>
                <circle cx="100" cy="100" r="60" fill="white"/>
                <rect x="60" y="70" width="80" height="70" rx="24" fill="#00AEEC"/>
                <rect x="70" y="85" width="60" height="35" rx="12" fill="white"/>
                <circle cx="85" cy="102.5" r="5" fill="#00AEEC"/>
                <circle cx="115" cy="102.5" r="5" fill="#00AEEC"/>
                <path d="M100 70V50" stroke="#00AEEC" stroke-width="6" stroke-linecap="round"/>
                <circle cx="100" cy="45" r="8" fill="#FF6699"/>
              </svg>
            </div>
            <h2 class="welcome-text">我是灵感 AI</h2>
            <p class="welcome-desc">基于智能引擎 · 助力创作与发现</p>

            <div v-if="sessions.length > 0" class="recent-chats-box">
              <div class="recent-header">
                <span>最近对话</span>
                <button class="clear-btn" @click="clearAllHistory">清空历史</button>
              </div>
              <div class="recent-grid">
                <div
                    v-for="session in sessions.slice(0, 6)"
                    :key="session.chatId"
                    class="session-card"
                    @click="selectSession(session)"
                >
                  <svg viewBox="0 0 24 24" width="14" class="icon">
                    <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span class="stitle">{{ session.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
          <div class="avatar-box">
            <div v-if="msg.role === 'assistant'" class="ai-avatar-icon">
              <svg viewBox="0 0 200 200">
                <rect x="40" y="60" width="120" height="100" rx="30" fill="#00AEEC"/>
                <rect x="60" y="80" width="80" height="50" rx="15" fill="white"/>
                <circle cx="80" cy="105" r="8" fill="#00AEEC"/>
                <circle cx="120" cy="105" r="8" fill="#00AEEC"/>
                <path d="M100 60V30" stroke="#00AEEC" stroke-width="10" stroke-linecap="round"/>
                <circle cx="100" cy="25" r="12" fill="#FF6699"/>
              </svg>
            </div>
            <div v-else class="user-avatar">ME</div>
          </div>
          <div class="bubble-container">
            <div
                v-if="msg.role === 'assistant'"
                class="bubble markdown-body"
                v-html="md.render(msg.content || '...')"
            ></div>
            <div v-else class="bubble user-bubble">{{ msg.content }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="input-area-wrapper">
      <div class="input-capsule-container">
        <div class="input-capsule">
          <textarea
              v-model="userInput"
              placeholder="输入您的灵感需求或问题..."
              rows="1"
              @keydown="handleKeydown"
              :disabled="isStreaming"
          ></textarea>
          <button
              class="send-trigger"
              @click="handleSendMessage"
              :disabled="isStreaming || !userInput.trim()"
          >
            <svg v-if="!isStreaming" viewBox="0 0 24 24" width="20">
              <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <span v-else class="loading-spin"></span>
          </button>
        </div>
        <div class="footer-note" v-if="isFirstMessage">
          <svg viewBox="0 0 24 24" width="14" height="14" class="lock-icon" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          本地加密存储，保护隐私安全
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #fcfdfe;
  position: relative;
}

.active-chat-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  background: rgba(252, 253, 254, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #f1f2f3;
  z-index: 100;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
  border: 1px solid transparent;
}

.home-btn {
  background: #f4f6f8;
  color: #61666D;
}

.home-btn:hover {
  background: #e3e5e7;
  color: #18191C;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.2);
}

.primary-btn:hover {
  background: #0096cc;
  transform: translateY(-1px);
}

.is-empty .chat-main-wrapper {
  flex: 1.4;
  justify-content: center;
}

.chat-main-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 80px 20px 20px;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
}

.chat-content {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.welcome-ui {
  text-align: center;
  margin-bottom: 40px;
  animation: fadeIn 0.5s ease;
}

.mascot-svg {
  width: 140px;
  height: 140px;
  animation: float 4s ease-in-out infinite;
}

.welcome-text {
  font-size: 36px;
  font-weight: 900;
  color: #18191C;
  margin: 15px 0 8px;
}

.welcome-desc {
  color: #9499A0;
  font-size: 15px;
}

.recent-chats-box {
  margin-top: 40px;
  text-align: left;
  max-width: 650px;
  margin-left: auto;
  margin-right: auto;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: #9499A0;
  padding: 0 5px;
}

.clear-btn {
  background: none;
  border: none;
  color: #ff6699;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
}

.clear-btn:hover {
  opacity: 1;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.session-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff;
  border: 1px solid #f1f2f3;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
  overflow: hidden;
}

.session-card:hover {
  border-color: #00AEEC;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.stitle {
  font-size: 13px;
  color: #61666D;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.message-item {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  animation: slideUp 0.3s ease;
}

.message-item.user {
  flex-direction: row-reverse;
}

.ai-avatar-icon {
  width: 40px;
  height: 40px;
  background: #e3f6fc;
  border-radius: 12px;
  padding: 6px;
  flex-shrink: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #E3E5E7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #61666D;
  flex-shrink: 0;
}

.bubble-container {
  max-width: 80%;
}

.bubble {
  padding: 12px 18px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
}

.assistant .bubble {
  background: #fff;
  border: 1px solid #f1f2f3;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
}

.user .bubble {
  background: #00AEEC;
  color: #fff;
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}

.input-area-wrapper {
  padding-bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-capsule-container {
  width: 100%;
  max-width: 800px;
  padding: 0 20px;
}

.input-capsule {
  display: flex;
  align-items: flex-end;
  background: #fff;
  padding: 10px 10px 10px 20px;
  border-radius: 24px;
  border: 2px solid #f1f2f3;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  transition: 0.3s;
}

.input-capsule:focus-within {
  border-color: #00AEEC;
  box-shadow: 0 10px 30px rgba(0, 174, 236, 0.08);
}

.input-capsule textarea {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 10px 0;
  background: transparent;
  resize: none;
  max-height: 150px;
  font-family: inherit;
  line-height: 1.5;
}

.send-trigger {
  background: #00AEEC;
  color: #fff;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.footer-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 15px;
  font-size: 12px;
  color: #A8ABB2;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.loading-spin {
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>