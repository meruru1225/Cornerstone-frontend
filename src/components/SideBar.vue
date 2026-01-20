<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useSysboxStore } from '../stores/sysbox'
import { ElMessageBox, ElMessage } from 'element-plus'

// 定义事件：通知父组件打开登录弹窗
const emit = defineEmits(['trigger-auth'])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sysboxStore = useSysboxStore()

const currentUser = computed(() => {
  return (userStore.userInfo as any) || {}
})

const canAccessAdmin = computed(() => {
  if (!userStore.roles) return false
  return userStore.roles.includes('ADMIN') || userStore.roles.includes('AUDIT')
})

const menuItems = [
  {
    key: 'home',
    name: '探索广场',
    path: '/',
    iconPath: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z'
  },
  {
    key: 'publish',
    name: '发布内容',
    path: '/publish',
    iconPath: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z'
  },
  {
    key: 'ai',
    name: '灵感 AI',
    path: '/ai',
    iconPath: 'M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12l-2-2 4-4m-4 4H8'
  },
  {
    key: 'chat',
    name: '消息中心',
    path: '/chat',
    iconPath: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z'
  },
  {
    key: 'notify',
    name: '通知站',
    path: '/notify',
    iconPath: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    showBadge: true
  }
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleNavigate = (path: string) => {
  // 如果点击的是需要登录的页面（如发布、消息），且未登录，也可以在这里拦截触发弹窗
  // 目前简单处理：直接跳转，由路由守卫或页面内部处理
  router.push(path)
}

// 触发登录弹窗
const handleLoginClick = () => {
  emit('trigger-auth')
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(async () => {
    await userStore.logout()
    sysboxStore.clearCount()
    ElMessage.success('已退出登录')
    // 退出后跳转回首页，而不是不存在的 /login
    router.push('/')
  })
}

let pollingTimer: number | null = null

const startPolling = () => {
  if (pollingTimer) return
  sysboxStore.fetchUnreadCount()
  pollingTimer = setInterval(() => {
    if (userStore.userInfo) {
      sysboxStore.fetchUnreadCount()
    } else {
      stopPolling()
    }
  }, 30000)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(() => {
  watch(
      () => userStore.userInfo,
      (newVal) => {
        if (newVal) {
          startPolling()
        } else {
          stopPolling()
        }
      },
      { immediate: true }
  )
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-box" @click="router.push('/')">
        <img src="/src/assets/logo.png" alt="Cornerstone" class="logo-img" />
        <span class="logo-text">CORNERSTONE</span>
      </div>
    </div>

    <nav class="sidebar-menu">
      <div
          v-for="item in menuItems" :key="item.key"
          class="menu-pill"
          :class="{ active: isActive(item.path) }"
          @click="handleNavigate(item.path)"
      >
        <svg class="menu-icon" viewBox="0 0 24 24">
          <path fill="currentColor" :d="item.iconPath" />
        </svg>
        <span class="menu-name">{{ item.name }}</span>

        <span
            v-if="item.showBadge && sysboxStore.unreadCount > 0"
            class="unread-badge"
        >
          {{ sysboxStore.unreadCount > 99 ? '99+' : sysboxStore.unreadCount }}
        </span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <template v-if="userStore.userInfo">
        <div v-if="canAccessAdmin" class="menu-pill admin-pill" @click="router.push('/admin')">
          <svg class="menu-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <span class="menu-name">管理员系统</span>
        </div>

        <div class="menu-pill settings-pill" :class="{ active: isActive('/settings/account') }" @click="router.push('/settings/account')">
          <svg class="menu-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.68 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span class="menu-name">账号设置</span>
        </div>

        <div class="user-pill" @click="router.push(currentUser.user_id ? `/space?id=${currentUser.user_id}` : '/login')">
          <img alt="头像" :src="currentUser.avatar_url || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="avatar" />
          <div class="user-info">
            <span class="nickname">{{ currentUser.nickname || '加载中...' }}</span>
            <span class="user-tag">个人中心</span>
          </div>
        </div>

        <div class="footer-actions">
          <button class="action-link" @click="router.push('/settings/profile')">修改资料</button>
          <span class="action-divider">·</span>
          <button class="action-link" @click="handleLogout">退出登录</button>
        </div>
      </template>

      <template v-else>
        <div class="user-card unauth-card" @click="handleLoginClick">
          <img src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" alt="未登录" class="avatar" />
          <div class="user-info">
            <span class="nickname">未登录</span>
            <span class="user-tag">点击登录</span>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  box-sizing: border-box;
  width: 240px;
  background-color: #FFFFFF;
  border-right: 1px solid rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  padding: 32px 20px;
  height: 100vh;
  position: sticky;
  top: 0;
}

.sidebar-header {
  padding-bottom: 24px;
  margin-bottom: 12px;
}

.logo-box { display: flex; align-items: center; gap: 10px; padding: 0 10px; cursor: pointer; }
.logo-img { width: 28px; height: 28px; }
.logo-text { font-weight: 900; font-size: 16px; color: #00AEEC; letter-spacing: 1px; }

.sidebar-menu { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.menu-pill {
  display: flex; align-items: center; gap: 14px; padding: 12px 20px; border-radius: 50px;
  cursor: pointer; transition: all 0.25s ease; color: #606266; font-weight: 500;
  position: relative;
}
.menu-pill:hover { background-color: rgba(0, 174, 236, 0.05); color: #00AEEC; }
.menu-pill.active { background-color: #00AEEC; color: #FFFFFF; box-shadow: 0 8px 20px rgba(0, 174, 236, 0.2); transform: translateX(4px); }
.menu-icon { width: 20px; height: 20px; flex-shrink: 0; }

.unread-badge {
  position: absolute;
  right: 12px;
  background: #FF4757;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.sidebar-footer { padding-top: 20px; border-top: 1px solid #F2F3F5; display: flex; flex-direction: column; gap: 10px; }

.admin-pill { margin-bottom: 0px; color: #FFB027; }
.admin-pill:hover { background-color: rgba(255, 176, 39, 0.1); color: #FFB027; }

.settings-pill { margin-bottom: 4px; }

.user-pill {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background-color: #F4F6F8;
  border-radius: 20px; cursor: pointer; transition: all 0.2s;
}
.user-pill:hover { background-color: #EDF0F3; transform: translateY(-1px); }

.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; object-fit: cover; }
.user-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.nickname { font-weight: 600; font-size: 14px; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-tag { font-size: 11px; color: #9499A0; }

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 5px;
}
.action-link {
  background: transparent;
  color: #9499A0;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.action-link:hover { color: #00AEEC; }
.action-divider { color: #E3E5E7; font-size: 12px; }

.user-card.unauth-card {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background-color: #F4F6F8;
  border-radius: 20px; cursor: pointer; transition: all 0.2s;
}
.user-card.unauth-card:hover { background-color: #EDF0F3; transform: translateY(-1px); }
</style>