<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const menuItems = [
  {
    key: 'home',
    name: '创作首页',
    path: '/creator',
    iconPath: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z'
  },
  {
    key: 'publish',
    name: '发布帖子',
    path: '/creator/publish',
    iconPath: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z'
  },
  {
    key: 'dashboard',
    name: '数据看板',
    path: '/creator/dashboard',
    iconPath: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
    children: [
      { key: 'fans', name: '粉丝数据', path: '/creator/dashboard/fans' },
      { key: 'content', name: '内容数据', path: '/creator/dashboard/content' },
      { key: 'posts', name: '帖子数据', path: '/creator/dashboard/posts' }
    ]
  },
  {
    key: 'manage',
    name: '帖子管理',
    path: '/creator/manage',
    iconPath: 'M4 4h16v2H4V4zm0 7h16v2H4v-2zm0 7h16v2H4v-2z'
  }
]

const activePath = computed(() => route.path)
const isActive = (path: string) => activePath.value === path
const isGroupActive = (path: string) => activePath.value.startsWith(path)

const handleNavigate = (item: typeof menuItems[number]) => {
  const firstChild = item.children?.[0]
  if (firstChild) {
    router.push(firstChild.path)
    return
  }
  router.push(item.path)
}

const waitForUserState = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(async () => {
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    await waitForUserState(500)
  }
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    await userStore.fetchUserInfo()
  }
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="creator-layout">
    <aside class="creator-sidebar">
      <div class="sidebar-header" @click="router.push('/')">
        <img src="/src/assets/logo.png" alt="Cornerstone" class="logo-img" />
        <div class="logo-text">创作中心</div>
      </div>

      <nav class="sidebar-menu">
        <div v-for="item in menuItems" :key="item.key" class="menu-group">
          <div
            class="menu-pill"
            :class="{ active: item.children ? isGroupActive(item.path) : isActive(item.path) }"
            @click="handleNavigate(item)"
          >
            <svg class="menu-icon" viewBox="0 0 24 24">
              <path fill="currentColor" :d="item.iconPath" />
            </svg>
            <span class="menu-name">{{ item.name }}</span>
            <svg v-if="item.children" class="arrow-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7 10l5 5 5-5z" />
            </svg>
          </div>

          <div v-if="item.children" class="submenu">
            <div
              v-for="child in item.children"
              :key="child.key"
              class="submenu-item"
              :class="{ active: isActive(child.path) }"
              @click.stop="router.push(child.path)"
            >
              {{ child.name }}
            </div>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="back-btn" @click="router.push('/')">
          返回主系统
        </button>
        <div v-if="userStore.userInfo" class="user-card">
          <img :src="userStore.userInfo.avatar_url || defaultAvatar" class="avatar" />
          <div class="user-info">
            <div class="nickname">{{ userStore.userInfo.nickname }}</div>
            <div class="sub">创作者</div>
          </div>
        </div>
      </div>
    </aside>

    <main class="creator-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.creator-layout {
  display: flex;
  height: 100vh;
  background-color: #F8F9FB;
}

.creator-sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid rgba(0, 0, 0, 0.04);
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 24px;
  cursor: pointer;
}

.logo-img {
  width: 28px;
  height: 28px;
}

.logo-text {
  font-weight: 900;
  font-size: 16px;
  color: #00AEEC;
  letter-spacing: 1px;
}

.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-pill {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #606266;
  font-weight: 500;
  position: relative;
}

.menu-pill:hover {
  background-color: rgba(0, 174, 236, 0.05);
  color: #00AEEC;
}

.menu-pill.active {
  background-color: #00AEEC;
  color: #FFFFFF;
  box-shadow: 0 8px 20px rgba(0, 174, 236, 0.2);
  transform: translateX(4px);
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.arrow-icon {
  width: 18px;
  height: 18px;
  margin-left: auto;
}

.submenu {
  margin: 0 0 0 20px;
  padding-left: 10px;
  border-left: 1px dashed rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.submenu-item {
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 13px;
  color: #61666D;
  cursor: pointer;
  transition: all 0.2s;
}

.submenu-item:hover {
  background: rgba(0, 174, 236, 0.08);
  color: #00AEEC;
}

.submenu-item.active {
  background: rgba(0, 174, 236, 0.15);
  color: #00AEEC;
  font-weight: 600;
}

.sidebar-footer {
  padding-top: 20px;
  border-top: 1px solid #F2F3F5;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-btn {
  border: 1px solid #E3E5E7;
  background: #fff;
  color: #61666D;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #00AEEC;
  color: #00AEEC;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #F4F6F8;
  border-radius: 16px;
  padding: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  font-weight: 700;
  font-size: 13px;
  color: #18191C;
}

.sub {
  font-size: 11px;
  color: #9499A0;
}

.creator-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}
</style>
