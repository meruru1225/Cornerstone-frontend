<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const waitForUserState = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(async () => {
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    await waitForUserState(500)
  }
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    await userStore.fetchUserInfo()
    await userStore.fetchUserRoles()
  } else if (!userStore.roles.length) {
    await userStore.fetchUserRoles()
  }
  const hasAccess = userStore.roles.includes('ADMIN') || userStore.roles.includes('AUDIT')
  if (!userStore.isLoggedIn || !userStore.userInfo || !hasAccess) {
    router.replace('/')
  }
})

const isSuperAdmin = computed(() => userStore.roles.includes('ADMIN'))

const adminMenu = computed(() => {
  const menu = []

  menu.push({
    group: '概览',
    items: [
      { name: '管理员首页', path: '/admin', icon: 'M3 10.5L12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' }
    ]
  })

  // 仅超级管理员可见用户管理
  if (isSuperAdmin.value) {
    menu.push({
      group: '用户管理',
      items: [
        { name: '用户查询与状态', path: '/admin/users', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
        { name: '角色权限分配', path: '/admin/roles', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z' }
      ]
    })
  }

  // 审计员和管理员均可见帖子管理
  menu.push({
    group: '内容管理',
    items: [
      { name: '帖子审核队列', path: '/admin/posts', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z' },
    ]
  })

  return menu
})

const activePath = computed(() => route.path)
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo-box" @click="router.push('/')">
          <div class="admin-tag">ADMIN</div>
          <span class="logo-text">管理控制台</span>
        </div>
      </div>

      <nav class="admin-menu">
        <div v-for="group in adminMenu" :key="group.group" class="menu-group">
          <div class="group-title">{{ group.group }}</div>
          <div
              v-for="item in group.items" :key="item.path"
              class="menu-pill"
              :class="{ active: activePath === item.path }"
              @click="router.push(item.path)"
          >
            <svg class="menu-icon" viewBox="0 0 24 24">
              <path fill="currentColor" :d="item.icon" />
            </svg>
            <span class="menu-name">{{ item.name }}</span>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="back-main-btn" @click="router.push('/')">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          返回主系统
        </button>

        <div class="user-pill" v-if="userStore.userInfo">
          <img :src="userStore.userInfo.avatar_url" class="avatar" />
          <div class="user-info">
            <span class="nickname">{{ userStore.userInfo.nickname }}</span>
            <span class="user-role">{{ isSuperAdmin ? '超级管理员' : '审核员' }}</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* 继承并适配 MainLayout 的基础样式 */
.admin-layout {
  display: flex;
  height: 100vh;
  background-color: #F4F6F9;
}

.admin-sidebar {
  width: 260px; /* 管理端略宽，容纳更长的标题 */
  background-color: #FFFFFF;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 0 10px 32px;
}

.admin-tag {
  background-color: #18191C;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
}

.logo-text {
  font-weight: 800;
  font-size: 16px;
  color: #303133;
}

.admin-menu {
  flex: 1;
  overflow-y: auto;
}

.menu-group {
  margin-bottom: 24px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #9499A0;
  padding-left: 16px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #606266;
  font-size: 14px;
  margin-bottom: 4px;
}

.menu-pill:hover {
  background-color: #F8F9FA;
  color: #18191C;
}

.menu-pill.active {
  background-color: #18191C;
  color: #FFFFFF;
  font-weight: 600;
}

.menu-icon {
  width: 18px;
  height: 18px;
}

.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid #F2F3F5;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-main-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #DCDFE6;
  border-radius: 10px;
  background: #FFF;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-main-btn:hover {
  border-color: #00AEEC;
  color: #00AEEC;
  background-color: rgba(0, 174, 236, 0.02);
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #F8F9FA;
  border-radius: 16px;
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
}

.nickname {
  font-weight: 700;
  font-size: 13px;
  color: #18191C;
}

.user-role {
  font-size: 11px;
  color: #9499A0;
}

.admin-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}
</style>
