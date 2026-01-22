<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import {
  MsgType, imClient, getConversationsApi, getHistoryMsgsApi,
  sendMsgApi, markMsgReadApi, type MsgItem, type ConversationItem, type MsgPayload
} from '../api/im'
import { uploadMediaApi } from '../api/media'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const userStore = useUserStore()
const conversations = ref<ConversationItem[]>([])
const currentConv = ref<ConversationItem | null>(null)
const messages = ref<MsgItem[]>([])
const inputMsg = ref('')
const msgListRef = ref<HTMLElement | null>(null)

const currentUserId = computed(() => userStore.userInfo?.user_id || 0)
const isLoadingHistory = ref(false)
const isHistoryFinished = ref(false)

// 交互状态
const isVoiceMode = ref(false)
const previewMedia = ref<{ url: string; type: 'image' | 'video' } | null>(null)
const currentPlayingUrl = ref<string>('')

let unsubs: (() => void) | null = null

// --- 补全缺失的状态变量 ---
const attachmentPreview = ref<{ url: string; file: File; type: 'image' | 'video' } | null>(null)
const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const recordTime = ref(0)
const waveLevels = ref<number[]>(new Array(10).fill(10))
let recordTimer: any = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let dataArray: Uint8Array | null = null
let animationFrameId: number | null = null

// --- 基础工具 ---
const scrollToBottom = (force = false) => {
  nextTick(() => {
    if (msgListRef.value) {
      const el = msgListRef.value
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
      if (isNearBottom || force) {
        el.scrollTop = el.scrollHeight
      }
    }
  })
}

const playAudio = (url: string) => {
  if (!url) return
  const audio = new Audio(url)
  currentPlayingUrl.value = url
  audio.play().catch(() => window.open(url, '_blank'))
  audio.onended = () => { currentPlayingUrl.value = '' }
  audio.onerror = () => { currentPlayingUrl.value = ''; ElMessage.error('音频无效') }
}

const openFile = (url: string) => { window.open(url, '_blank') }

// --- 会话列表 ---
const fetchList = async () => {
  try {
    const res: any = await getConversationsApi()
    conversations.value = res.data || []
  } catch (e) { console.error(e) }
}

const updateConversationLastMsg = (msg: MsgItem) => {
  const conv = conversations.value.find(c => c.conversation_id == msg.conversation_id)
  if (conv) {
    if (msg.msg_type === MsgType.AUDIO) {
      conv.last_msg_content = '[语音消息]'
    } else {
      // 简化预览逻辑
      if (msg.msg_type === MsgType.IMAGE) conv.last_msg_content = '[图片]'
      else if (msg.msg_type === MsgType.VIDEO) conv.last_msg_content = '[视频]'
      else if (msg.msg_type === MsgType.FILE) conv.last_msg_content = '[文件]'
      else conv.last_msg_content = msg.content || '[消息]'
    }

    conv.last_msg_type = msg.msg_type
    conv.last_message_at = msg.created_at || new Date().toISOString()

    if (currentConv.value?.conversation_id != msg.conversation_id) {
      conv.unread_count = (conv.unread_count || 0) + 1
    }
    conversations.value.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
  } else {
    fetchList()
  }
}

// --- 核心：消息加载逻辑 (纯网络版) ---

// 1. 切换会话
const selectConv = async (conv: ConversationItem) => {
  if (currentConv.value?.conversation_id === conv.conversation_id) return
  currentConv.value = conv
  messages.value = [] // 清空
  isHistoryFinished.value = false

  try {
    // 直接拉取最新的 20 条
    const res: any = await getHistoryMsgsApi({
      conv_id: conv.conversation_id,
      last_seq: 999999999, // 确保拉取最新
      page_size: 20
    })

    let remoteList: MsgItem[] = res.data || []
    if (remoteList.length > 0) {
      // 后端返回倒序，前端转正序
      messages.value = remoteList.sort((a, b) => a.seq - b.seq)
      scrollToBottom(true)

      // 标记已读
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.sender_id != currentUserId.value) {
        markMsgReadApi({ conversation_id: conv.conversation_id, sequence: lastMsg.seq })
        conv.unread_count = 0
      }
    }
  } catch (e) {
    console.error('Fetch history failed', e)
  }
}

// 2. 加载更多历史
const loadMoreHistory = async () => {
  if (!currentConv.value || isLoadingHistory.value || isHistoryFinished.value || messages.value.length === 0) return
  isLoadingHistory.value = true

  const oldestMsg = messages.value[0]
  if (!oldestMsg) { isLoadingHistory.value = false; return }

  const listEl = msgListRef.value
  const oldHeight = listEl?.scrollHeight || 0

  try {
    const res: any = await getHistoryMsgsApi({
      conv_id: currentConv.value.conversation_id,
      last_seq: oldestMsg.seq,
      page_size: 20
    })

    const remoteList: MsgItem[] = res.data || []

    if (remoteList.length > 0) {
      const sorted = remoteList.sort((a, b) => a.seq - b.seq)
      messages.value = [...sorted, ...messages.value]

      nextTick(() => {
        if (listEl) listEl.scrollTop = listEl.scrollHeight - oldHeight
      })
    } else {
      isHistoryFinished.value = true
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingHistory.value = false
  }
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (target.scrollTop < 50) loadMoreHistory()
}

// --- 发送消息逻辑 ---
const handleSendClick = async () => {
  if (!inputMsg.value.trim() && !attachmentPreview.value) return

  let payload: MsgPayload[] | null = null
  let msgType = MsgType.TEXT

  if (attachmentPreview.value) {
    const { file, type } = attachmentPreview.value
    msgType = type === 'image' ? MsgType.IMAGE : MsgType.VIDEO // 简单映射
    try {
      const res: any = await uploadMediaApi(file)
      payload = [{
        mime_type: file.type,
        url: res.data.url,
        width: res.data.width,
        height: res.data.height,
        duration: res.data.duration
      }]
      clearAttachment()
    } catch (e) {
      ElMessage.error('上传失败')
      return
    }
  }
  await performSendMessage(msgType, inputMsg.value, payload)
}

const performSendMessage = async (type: number, content: string, payload: MsgPayload[] | null = null) => {
  if (!currentConv.value) return

  // 1. 临时上屏 (Optimistic UI)
  const tempId = 'temp-' + Date.now()
  const tempMsg: MsgItem = {
    id: tempId,
    conversation_id: currentConv.value.conversation_id,
    sender_id: currentUserId.value,
    msg_type: type as any,
    content: content,
    payload: payload,
    seq: 0,
    created_at: new Date().toISOString(),
    status: 'sending'
  }

  messages.value.push(tempMsg)
  scrollToBottom(true)
  inputMsg.value = ''

  try {
    const res: any = await sendMsgApi({
      conversation_id: currentConv.value.conversation_id,
      target_user_id: currentConv.value.peer_id,
      msg_type: type,
      content: content,
      payload: payload
    })

    // 2. 成功后替换为真实消息
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1 && res.data) {
      const realMsg = { ...res.data, status: 'success' }
      messages.value[idx] = realMsg
      updateConversationLastMsg(realMsg)
    }
  } catch (e) {
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) {
      const target = messages.value[idx]
      if (target) target.status = 'fail'
    }
  }
}

// --- WebSocket ---
onMounted(() => {
  fetchList()

  unsubs = imClient.subscribe((data: any) => {
    if (data.type === 'READ_RECEIPT') {
      if (currentConv.value && currentConv.value.conversation_id == data.conversation_id) {
        currentConv.value.peer_read_seq = data.read_seq
      }
      return
    }

    if (data.conversation_id) {
      updateConversationLastMsg(data)

      if (currentConv.value && currentConv.value.conversation_id == data.conversation_id) {
        // ID 去重
        const exists = messages.value.some(m => m.id == data.id)
        if (!exists) {
          messages.value.push(data)
          messages.value.sort((a, b) => a.seq - b.seq)
          scrollToBottom(true)

          if (data.sender_id != currentUserId.value) {
            markMsgReadApi({ conversation_id: data.conversation_id, sequence: data.seq })
          }
        }
      }
    }
  })
})

onUnmounted(() => { unsubs?.(); clearAttachment(); })

// --- 附件与录音工具函数 ---
const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  let fileType: 'image' | 'video' = 'image'
  if (file.type.startsWith('video/')) fileType = 'video'
  attachmentPreview.value = { url: URL.createObjectURL(file), file: file, type: fileType }
}

const toggleRecord = async () => {
  if (isRecording.value) stopRecordingProcess()
  else await startRecordingProcess()
}

const startRecordingProcess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AudioContextClass()
    if (audioCtx) {
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      dataArray = new Uint8Array(analyser.frequencyBinCount as any)
      updateWaveform()
    }
    let mimeType = 'audio/webm'; let fileExt = 'webm'
    if (MediaRecorder.isTypeSupported('audio/mp4')) { mimeType = 'audio/mp4'; fileExt = 'm4a' }
    else if (MediaRecorder.isTypeSupported('audio/aac')) { mimeType = 'audio/aac'; fileExt = 'aac' }
    mediaRecorder.value = new MediaRecorder(stream, { mimeType })
    audioChunks.value = []
    mediaRecorder.value.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.value.push(e.data) }
    mediaRecorder.value.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (audioCtx) audioCtx.close()
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (audioChunks.value.length === 0) return
      const audioBlob = new Blob(audioChunks.value, { type: mimeType })
      if (audioBlob.size < 100) { ElMessage.warning('录音时间太短'); return }
      const file = new File([audioBlob], `voice_${Date.now()}.${fileExt}`, { type: mimeType })
      try {
        const res: any = await uploadMediaApi(file)
        if (res.data?.url) {
          const payload: MsgPayload = { mime_type: mimeType, url: res.data.url, duration: recordTime.value }
          await performSendMessage(MsgType.AUDIO, '[语音消息]', [payload])
        }
      } catch (e) { ElMessage.error('语音发送失败') }
    }
    mediaRecorder.value.start(1000)
    isRecording.value = true
    recordTime.value = 0
    recordTimer = setInterval(() => recordTime.value++, 1000)
  } catch (e) { ElMessage.error('无法启动录音') }
}

const stopRecordingProcess = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    clearInterval(recordTimer)
  }
}

const updateWaveform = () => {
  if (!analyser || !dataArray) return
  analyser.getByteFrequencyData(dataArray as any)
  const step = Math.floor(dataArray.length / 10)
  for (let i = 0; i < 10; i++) {
    const val = dataArray[i * step] || 0
    waveLevels.value[i] = Math.max(10, (val / 255) * 100)
  }
  animationFrameId = requestAnimationFrame(updateWaveform)
}
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <div class="conv-panel">
        <div class="panel-header">消息中心</div>
        <div class="conv-list custom-scrollbar">
          <div v-for="c in conversations" :key="c.conversation_id"
               class="conv-item" :class="{ active: currentConv?.conversation_id === c.conversation_id }"
               @click="selectConv(c)">
            <img :src="c.cover_url || defaultAvatar" class="c-avatar" alt="头像" />
            <div class="c-info">
              <div class="c-top">
                <span class="c-name">{{ c.title || '未知用户' }}</span>
                <span class="c-time">{{ new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
              <div class="c-bottom">
                <span class="c-last">{{ c.last_msg_content }}</span>
                <div v-if="c.unread_count > 0" class="badge">{{ c.unread_count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-window">
        <template v-if="currentConv">
          <div class="window-header"><span class="header-name">{{ currentConv.title }}</span></div>

          <div class="message-list custom-scrollbar" ref="msgListRef" @scroll="handleScroll">
            <div v-if="isLoadingHistory" class="history-loading">加载中...</div>
            <div v-for="m in messages" :key="m.id" class="msg-row" :class="{ 'is-me': m.sender_id === currentUserId }">
              <img :src="m.sender_id === currentUserId ? (userStore.userInfo?.avatar_url || defaultAvatar) : (currentConv.cover_url || defaultAvatar)"
                   class="bubble-avatar" alt="用户" />
              <div class="bubble-wrapper">
                <div class="bubble-box" :class="{ 'sending': m.status === 'sending', 'fail': m.status === 'fail' }">

                  <template v-if="[MsgType.TEXT, MsgType.IMAGE, MsgType.VIDEO, MsgType.FILE].includes(m.msg_type)">
                    <div v-if="m.content" class="text-node">{{ m.content }}</div>
                    <template v-if="m.payload && m.payload.length > 0">
                      <div v-for="(p, idx) in m.payload" :key="idx" class="payload-content" :class="{ 'has-text': !!m.content }">
                        <img v-if="p?.mime_type?.startsWith('image/')" :src="p.url" class="msg-img" alt="图片"
                             @click="previewMedia = {url: p.url, type: 'image'}"/>

                        <div v-else-if="p?.mime_type?.startsWith('video/')" class="msg-video-container"
                             @click="previewMedia = {url: p.url, type: 'video'}">
                          <video :src="p.url" class="msg-video-thumb"></video>
                          <div class="video-overlay-icon">
                            <svg viewBox="0 0 24 24" width="32" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                          <div class="video-duration" v-if="p.duration">{{ Math.round(p.duration) }}s</div>
                        </div>

                        <div v-else class="msg-file-bubble" @click="openFile(p.url)">
                          <svg viewBox="0 0 24 24" width="20"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.89-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.89 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                          <span class="file-txt">文件</span>
                        </div>
                      </div>
                    </template>
                  </template>

                  <template v-else-if="m.msg_type === MsgType.AUDIO && m.payload?.[0]">
                    <div class="msg-voice-bubble"
                         :class="{ 'playing': currentPlayingUrl === m.payload[0].url }"
                         @click="playAudio(m.payload[0].url)">
                      <div class="voice-icon">
                        <svg viewBox="0 0 24 24" width="20" fill="currentColor">
                          <rect x="3" y="9" width="2" height="6" rx="1"></rect>
                          <rect x="7" y="6" width="2" height="12" rx="1"></rect>
                          <rect x="11" y="3" width="2" height="18" rx="1"></rect>
                          <rect x="15" y="6" width="2" height="12" rx="1"></rect>
                          <rect x="19" y="9" width="2" height="6" rx="1"></rect>
                        </svg>
                      </div>
                      <span class="voice-txt">{{ m.payload[0].duration ? Math.round(m.payload[0].duration) + '"' : '语音' }}</span>
                    </div>
                  </template>

                  <span v-else-if="m.msg_type === MsgType.RECALL" class="italic">消息已撤回</span>

                </div>
                <div v-if="m.sender_id === currentUserId" class="read-status">
                  <span v-if="m.status === 'fail'" class="status-error">失败</span>
                  <span v-else-if="m.status === 'sending'" class="status-loading">发送中...</span>
                  <span v-else :class="{ 'is-read': m.seq <= currentConv.peer_read_seq }">{{ m.seq <= currentConv.peer_read_seq ? '已读' : '未读' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isRecording" class="recording-center-overlay">
            <div class="wave-container">
              <div v-for="(h, i) in waveLevels" :key="i" class="wave-bar" :style="{ height: h + '%' }"></div>
            </div>
            <div class="record-timer">{{ recordTime }}s</div>
            <div class="record-hint">正在录音... (点击底部按钮发送)</div>
          </div>

          <div class="input-section">
            <div v-if="attachmentPreview" class="attachment-preview-bar">
              <div class="preview-item">
                <img v-if="attachmentPreview.type === 'image'" :src="attachmentPreview.url" alt="预览" />
                <div v-else class="file-placeholder"><svg viewBox="0 0 24 24" width="24"><path fill="#666" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>
                <div class="remove-preview" @click="clearAttachment">×</div>
              </div>
            </div>

            <div class="input-row">
              <div class="mode-toggle-btn" @click="isVoiceMode = !isVoiceMode" :class="{ 'disabled': isRecording }">
                <svg v-if="isVoiceMode" viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="28" fill="currentColor">
                  <rect x="3" y="9" width="2" height="6" rx="1"></rect>
                  <rect x="7" y="6" width="2" height="12" rx="1"></rect>
                  <rect x="11" y="3" width="2" height="18" rx="1"></rect>
                  <rect x="15" y="6" width="2" height="12" rx="1"></rect>
                  <rect x="19" y="9" width="2" height="6" rx="1"></rect>
                </svg>
              </div>

              <div class="input-control">
                <input v-if="!isVoiceMode" v-model="inputMsg" placeholder="发送消息..." @keyup.enter="handleSendClick" />
                <div v-else
                     class="voice-action-btn"
                     :class="{ 'recording': isRecording }"
                     @click="toggleRecord">
                  {{ isRecording ? '正在录音... 点击发送' : '点击开始录音' }}
                </div>
              </div>

              <div class="input-actions">
                <div class="tool-icon-wrapper" :class="{ 'disabled': isRecording }">
                  <label class="tool-icon" title="附件">
                    <input type="file" @change="handleFileSelect" hidden :disabled="isRecording"/>
                    <svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5c0 2.21 1.79 4 4 4s4-1.79 4-4V5c0-2.48-2.02-4.5-4.5-4.5S8 2.52 8 5v12.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5V6h-1.5z"/></svg>
                  </label>
                </div>
                <button class="send-btn" @click="handleSendClick" :disabled="(!inputMsg.trim() && !attachmentPreview) || isRecording">发送</button>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" width="80" height="80"><path fill="#f0f0f0" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          <p>选择一个联系人开始聊天</p>
        </div>
      </div>
    </div>

    <div v-if="previewMedia && previewMedia.type" class="full-media-overlay" @click="previewMedia = null">
      <img v-if="previewMedia.type === 'image'" :src="previewMedia.url" alt="全屏" />
      <video v-else-if="previewMedia.type === 'video'" :src="previewMedia.url" controls autoplay @click.stop></video>
      <div class="close-btn">×</div>
    </div>
  </div>
</template>

<style scoped>
/* 核心布局 */
.chat-page { height: 100%; display: flex; align-items: flex-start; background: #f5f7f9; }
.chat-container { width: 100%; max-width: 1350px; height: 100%; margin: 0 auto; background: #fff; display: flex; overflow: hidden; border-radius: 32px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); }

.conv-panel { width: 380px; border-right: 1px solid #f0f2f5; display: flex; flex-direction: column; background: #fff; }
.panel-header { padding: 28px 24px; font-size: 22px; font-weight: 800; color: #18191c; }
.conv-list { flex: 1; overflow-y: auto; }
.conv-item { display: flex; gap: 14px; padding: 18px 24px; cursor: pointer; transition: all 0.2s; border-left: 4px solid transparent; margin: 4px 12px; border-radius: 20px; }
.conv-item:hover { background: #f8f9fb; }
.conv-item.active { background: #edf8ff; border-left-color: #00aeec; }

.c-avatar { width: 52px; height: 52px; border-radius: 18px; object-fit: cover; }
.c-info { flex: 1; min-width: 0; }
.c-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
.c-name { font-weight: 700; font-size: 15px; color: #18191c; }
.c-time { font-size: 12px; color: #9499a0; }
.c-bottom { display: flex; justify-content: space-between; align-items: center; }
.c-last { font-size: 13px; color: #61666d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { background: #ff4757; color: #fff; font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 700; }

.chat-window { flex: 1; display: flex; flex-direction: column; background: #fcfdfe; position: relative; }
.window-header { height: 72px; border-bottom: 1px solid #f0f2f5; padding: 0 32px; display: flex; align-items: center; font-weight: 800; font-size: 18px; background: #fff; }
.message-list { flex: 1; overflow-y: auto; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
.history-loading { text-align: center; color: #999; font-size: 12px; padding: 10px; }

/* 消息行与气泡 */
.msg-row { display: flex; gap: 14px; align-items: flex-end; }
.msg-row.is-me { flex-direction: row-reverse; }
.bubble-avatar { width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; border: 1px solid #f0f0f0; object-fit: cover; }

.bubble-wrapper { max-width: 70%; display: flex; flex-direction: column; position: relative; }
.is-me .bubble-wrapper { align-items: flex-end; }

.bubble-box { padding: 12px 18px; border-radius: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); font-size: 15px; line-height: 1.6; color: #18191c; word-break: break-all; display: flex; flex-direction: column; align-items: flex-start; }
.is-me .bubble-box { background: #00aeec; color: #fff; border-bottom-right-radius: 4px; align-items: flex-start; }
.msg-row:not(.is-me) .bubble-box { border-bottom-left-radius: 4px; }

.bubble-box.sending { opacity: 0.6; }
.bubble-box.fail { border: 1px solid #ff4757; background: #fff1f2; }

/* 已读状态 */
.read-status {
  font-size: 11px;
  color: #9499a0;
  font-weight: 600;
  position: absolute;
  bottom: -18px;
  right: 0;
  white-space: nowrap;
}
.is-read { color: #00aeec; }
.status-error { color: #ff4757; }

.text-node { white-space: pre-wrap; margin-bottom: 8px; }
.payload-content { margin-top: 4px; }
.payload-content.has-text { margin-top: 8px; }

.msg-img { max-width: 300px; max-height: 400px; border-radius: 12px; cursor: pointer; object-fit: cover; }
.msg-video-container { position: relative; max-width: 300px; border-radius: 12px; overflow: hidden; cursor: pointer; }
.msg-video-thumb { width: 100%; display: block; border-radius: 12px; max-height: 400px; object-fit: cover; background: #000; }
.video-overlay-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.5); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
.video-duration { position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 4px; }

/* 语音气泡 */
.msg-voice-bubble {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 80px;
  transition: opacity 0.2s;
  height: 24px;
  line-height: 1;
}
.voice-icon { display: flex; height: 20px; align-items: center; }
.msg-voice-bubble:hover { opacity: 0.8; }
.is-me .msg-voice-bubble.playing { color: #fff; }
.msg-row:not(.is-me) .msg-voice-bubble.playing { color: #00aeec; }

.msg-file-bubble { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 700; }

/* 输入区 */
.input-section { padding: 16px 32px 28px; background: #fff; border-top: 1px solid #f0f2f5; position: relative; }
.input-row { display: flex; align-items: center; gap: 10px; }

.mode-toggle-btn, .tool-icon-wrapper { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #61666d; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.mode-toggle-btn:hover, .tool-icon-wrapper:hover { background: #f0f2f5; color: #18191c; }
.mode-toggle-btn.disabled, .tool-icon-wrapper.disabled { opacity: 0.5; pointer-events: none; }

.input-control { flex: 1; min-width: 0; margin-right: 12px; }
.input-control input { width: 100%; height: 50px; border: none; background: #f4f6f8; padding: 0 24px; border-radius: 26px; outline: none; font-size: 16px; box-sizing: border-box; }

.voice-action-btn { width: 100%; height: 50px; background: #f4f6f8; border-radius: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #61666d; cursor: pointer; user-select: none; transition: all 0.2s; box-sizing: border-box; }
.voice-action-btn:active { background: #e3e5e7; color: #18191c; }
.voice-action-btn.recording { background: #e3f9e5; color: #27ae60; border: 1px solid #27ae60; }

.input-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.tool-icon { display: flex; align-items: center; cursor: pointer; }
.send-btn { background: #00aeec; color: #fff; border: none; padding: 0 24px; height: 44px; border-radius: 14px; font-weight: 800; cursor: pointer; }
.send-btn:disabled { background: #e3e5e7; color: #9499a0; cursor: not-allowed; }

.attachment-preview-bar { padding: 12px 0; border-top: 1px solid #f0f2f5; margin-bottom: 8px; }
.preview-item { position: relative; width: 64px; height: 64px; border-radius: 12px; overflow: hidden; border: 1px solid #eee; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; }
.remove-preview { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-bottom-left-radius: 8px; }

.full-media-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(15px); z-index: 1000; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.full-media-overlay img, .full-media-overlay video { max-width: 95%; max-height: 95%; border-radius: 12px; box-shadow: 0 10px 50px rgba(0,0,0,0.6); }
.close-btn { position: absolute; top: 30px; right: 30px; color: #fff; font-size: 44px; font-weight: 200; cursor: pointer; }

.recording-center-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); width: 180px; height: 180px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; z-index: 100; gap: 16px; }
.wave-container { display: flex; gap: 4px; align-items: center; height: 40px; }
.wave-bar { width: 4px; background: #00aeec; border-radius: 2px; transition: height 0.1s ease; }
.record-timer { font-size: 24px; font-weight: 700; font-feature-settings: "tnum"; }
.record-hint { font-size: 12px; opacity: 0.8; }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e3e5e7; border-radius: 10px; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9499a0; gap: 20px; }
.italic { font-style: italic; color: #999; }
</style>