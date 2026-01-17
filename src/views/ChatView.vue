<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../api/request'

// 会话与消息状态
const conversations = ref<any[]>([])
const currentConvId = ref<number | null>(null)
const messages = ref<any[]>([])
const loading = ref(false)

// 获取会话列表
const fetchConversations = async () => {
  const res: any = await request.get('/im/list')
  conversations.value = res.data || []
}

// 选中会话并加载聊天记录
const selectConversation = async (convId: number) => {
  currentConvId.value = convId
  loading.value = true
  try {
    const res: any = await request.get('/im/sync', { params: { conv_id: convId, last_seq: 0 } })
    messages.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchConversations())
</script>

<template>
  <div class="chat-container">
    <div class="conv-list">
      <div class="list-header">最近消息</div>
      <div
          v-for="item in conversations" :key="item.conversation_id"
          class="conv-item"
          :class="{ active: currentConvId === item.conversation_id }"
          @click="selectConversation(item.conversation_id)"
      >
        <div class="avatar-placeholder">{{ item.last_sender_id }}</div>
        <div class="conv-info">
          <div class="name-row">
            <span class="name">用户 {{ item.peer_id || '系统消息' }}</span>
            <span class="time">12:00</span>
          </div>
          <div class="last-msg">{{ item.last_msg_content }}</div>
        </div>
        <div v-if="item.unreadCount > 0" class="badge">{{ item.unreadCount }}</div>
      </div>
    </div>

    <div class="chat-window">
      <template v-if="currentConvId">
        <div class="window-header">正在与用户聊天</div>
        <div class="message-list">
          <div v-for="msg in messages" :key="msg.id" class="msg-bubble" :class="{ 'mine': msg.sender_id !== 0 }">
            <div class="content">{{ msg.content }}</div>
          </div>
        </div>
        <div class="input-area">
          <input type="text" placeholder="输入消息..." />
          <button class="send-btn">发送</button>
        </div>
      </template>
      <div v-else class="empty-state">选择一个联系人开始聊天</div>
    </div>
  </div>
</template>

<style scoped>
.chat-container { display: flex; height: 100vh; background: #fff; }
.conv-list { width: 320px; border-right: 1px solid #eee; display: flex; flex-direction: column; }
.list-header { padding: 24px; font-size: 18px; font-weight: 800; border-bottom: 1px solid #f5f5f5; }
.conv-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; transition: background 0.2s; position: relative; }
.conv-item:hover { background: #f9f9f9; }
.conv-item.active { background: rgba(0, 174, 236, 0.05); }
.avatar-placeholder { width: 48px; height: 48px; background: #eee; border-radius: 12px; }
.conv-info { flex: 1; overflow: hidden; }
.name-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.name { font-weight: 600; font-size: 14px; }
.time { font-size: 12px; color: #999; }
.last-msg { font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { position: absolute; right: 20px; bottom: 16px; background: #ff4d4f; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; }

.chat-window { flex: 1; display: flex; flex-direction: column; background: #fcfcfc; }
.window-header { padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; font-weight: 600; }
.message-list { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.msg-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.02); align-self: flex-start; }
.msg-bubble.mine { align-self: flex-end; background: #00AEEC; color: #fff; }
.input-area { padding: 20px; background: #fff; border-top: 1px solid #eee; display: flex; gap: 12px; }
.input-area input { flex: 1; border: 1px solid #eee; border-radius: 12px; padding: 0 16px; outline: none; }
.send-btn { background: #00AEEC; color: #fff; border: none; padding: 8px 20px; border-radius: 10px; cursor: pointer; }
.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #999; }
</style>