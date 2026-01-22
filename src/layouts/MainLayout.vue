<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import SideBar from '../components/SideBar.vue'
import AuthModal from '../components/AuthModal.vue'
import {imClient, type MsgItem, MsgType} from '../api/im'
import {getUserSimpleApi, type UserSimpleInfo} from '../api/user'
import {useUserStore} from '../stores/user'
import {useImStore} from '../stores/im'

const isAuthVisible = ref(false)
const router = useRouter()
const userStore = useUserStore()
const imStore = useImStore()
const notifyVisible = ref(false)
const notifyContent = ref('')
const notifyUser = ref<UserSimpleInfo | null>(null)
const notifyConvId = ref(0)
const notifyTimer = ref<number | null>(null)
const userCache = new Map<number, UserSimpleInfo>()
let unsubs: (() => void) | null = null

const currentUserId = computed(() => userStore.userInfo?.user_id || 0)

// 简单的处理函数，其实直接写在模板里也可以
const showAuthModal = () => {
  isAuthVisible.value = true
}

const isMsgItem = (data: unknown): data is MsgItem => {
  if (!data || typeof data !== 'object') return false
  const target = data as MsgItem
  return target.msg_type !== undefined
}

const getMsgPreview = (msg: MsgItem) => {
  if (msg.msg_type === MsgType.AUDIO) return '[语音消息]'
  if (msg.msg_type === MsgType.RECALL) return '[消息撤回]'
  const payload = msg.payload || []
  if (payload.some(p => p?.mime_type?.startsWith('image/'))) return '[图片]'
  if (payload.some(p => p?.mime_type?.startsWith('video/'))) return '[视频]'
  if (payload.length > 0) return '[文件]'
  return msg.content || '[消息]'
}

const showToast = async (msg: MsgItem) => {
  if (!userStore.isLoggedIn) return
  if (!currentUserId.value || msg.sender_id === currentUserId.value) return
  if (msg.conversation_id === imStore.currentConvId) return

  notifyContent.value = getMsgPreview(msg)
  notifyConvId.value = msg.conversation_id
  notifyVisible.value = true

  const cached = userCache.get(msg.sender_id)
  if (cached) {
    notifyUser.value = cached
  } else {
    try {
      const res: any = await getUserSimpleApi(msg.sender_id)
      const data: UserSimpleInfo = res.data
      userCache.set(msg.sender_id, data)
      notifyUser.value = data
    } catch (e) {
      notifyUser.value = { user_id: msg.sender_id, nickname: '未知用户', avatar_url: '', bio: '' }
    }
  }

  if (notifyTimer.value) window.clearTimeout(notifyTimer.value)
  notifyTimer.value = window.setTimeout(() => {
    notifyVisible.value = false
  }, 5000)
}

const handleToastClick = () => {
  if (!notifyVisible.value) return
  notifyVisible.value = false
  if (notifyTimer.value) window.clearTimeout(notifyTimer.value)
  if (notifyConvId.value) {
    router.push({ path: '/chat', query: { conv_id: String(notifyConvId.value) } })
    return
  }
  if (notifyUser.value?.user_id) {
    router.push({
      path: '/chat',
      query: {
        target_user_id: String(notifyUser.value.user_id),
        title: notifyUser.value.nickname || '未知用户',
        cover_url: notifyUser.value.avatar_url || ''
      }
    })
  }
}

onMounted(() => {
  if (!unsubs) {
    unsubs = imClient.subscribe((data: unknown) => {
      if (!isMsgItem(data)) return
      showToast(data)
    })
  }
})

onUnmounted(() => {
  unsubs?.()
  unsubs = null
  if (notifyTimer.value) window.clearTimeout(notifyTimer.value)
})
</script>

<template>
  <div class="layout-container">
    <SideBar @trigger-auth="showAuthModal"/>

    <main class="main-content">
      <router-view/>
    </main>

    <AuthModal v-model="isAuthVisible"/>

    <div v-if="notifyVisible" class="im-toast" @click="handleToastClick">
      <div class="toast-avatar">
        <img :src="notifyUser?.avatar_url || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" alt="avatar"/>
      </div>
      <div class="toast-body">
        <div class="toast-name">{{ notifyUser?.nickname || '未知用户' }}</div>
        <div class="toast-content">{{ notifyContent }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  background-color: #F8F9FB;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}

.im-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #f1f2f3;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  min-width: 220px;
  max-width: 320px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.im-toast:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

.toast-avatar img {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.toast-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toast-name {
  font-size: 14px;
  font-weight: 700;
  color: #18191c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-content {
  font-size: 13px;
  color: #61666d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
