<script setup lang="ts">
import {onMounted, onUnmounted, watch} from 'vue'
import {useUserStore} from './stores/user'
import {useImStore} from './stores/im'
import {imClient, type MsgItem} from './api/im'

const userStore = useUserStore()
const imStore = useImStore()
let unsubs: (() => void) | null = null

const isMsgItem = (data: unknown): data is MsgItem => {
  if (!data || typeof data !== 'object') return false
  const target = data as MsgItem
  return target.msg_type !== undefined
}

const startIM = () => {
  if (userStore.isLoggedIn) {
    imClient.connect()
  }
}

const stopIM = () => {
  imClient.disconnect()
}

onMounted(async () => {
  await userStore.fetchUserInfo()
  startIM()
  if (userStore.isLoggedIn) {
    await imStore.fetchUnreadCount()
  }

  if (!unsubs) {
    unsubs = imClient.subscribe((data: unknown) => {
      if (!userStore.isLoggedIn) return
      if (!isMsgItem(data)) return
      const currentUserId = userStore.userInfo?.user_id || 0
      if (!currentUserId || data.sender_id === currentUserId) return
      if (data.conversation_id === imStore.currentConvId) return
      imStore.increaseUnread(1)
    })
  }
})

// 登录状态变化时重新连接
watch(() => userStore.isLoggedIn, (val) => {
  if (val) {
    startIM()
    imStore.fetchUnreadCount()
  } else {
    stopIM()
    imStore.clearUnread()
  }
})

onUnmounted(() => {
  unsubs?.()
  unsubs = null
})
</script>

<template>
  <router-view/>
</template>

<style>
/* 核心：禁止全局滚动 */
html, body, #app {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
