import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getConversationsApi, type ConversationItem } from '../api/im'

export const useImStore = defineStore('im', () => {
  const unreadCount = ref(0)
  const currentConvId = ref(0)

  const resetFromConversations = (conversations: ConversationItem[]) => {
    unreadCount.value = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
  }

  const fetchUnreadCount = async () => {
    try {
      const res: any = await getConversationsApi()
      const list: ConversationItem[] = res.data || []
      resetFromConversations(list)
    } catch (error) {
      console.error('获取会话未读数失败', error)
    }
  }

  const increaseUnread = (amount = 1) => {
    unreadCount.value += amount
  }

  const decreaseUnread = (amount = 1) => {
    unreadCount.value = Math.max(0, unreadCount.value - amount)
  }

  const clearUnread = () => {
    unreadCount.value = 0
  }

  const setCurrentConvId = (convId: number) => {
    currentConvId.value = convId
  }

  return {
    unreadCount,
    currentConvId,
    fetchUnreadCount,
    resetFromConversations,
    increaseUnread,
    decreaseUnread,
    clearUnread,
    setCurrentConvId
  }
})
