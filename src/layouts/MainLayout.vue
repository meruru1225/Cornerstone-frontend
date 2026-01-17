<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'

import AuthModal from '../components/AuthModal.vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// 根据 Pinia 中的 roles 信息判断是否显示管理员系统
const canAccessAdmin = computed(() => {
  return userStore.roles.includes('ADMIN') || userStore.roles.includes('AUDIT')
})

const isAuthVisible = ref(false)

const menuItems = [
  { name: '探索广场', path: '/', iconPath: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z' },
  { name: '发布内容', path: '/publish', iconPath: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z' },
  { name: '灵感 AI', path: '/ai', iconPath: 'M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12l-2-2 4-4m-4 4H8' },
  { name: '消息中心', path: '/chat', iconPath: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
  { name: '通知站', path: '/inbox', iconPath: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' }
]

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(async () => {
    await userStore.logout()
    ElMessage.success('已退出登录')
    await router.push('/')
  })
}

const activePath = computed(() => route.path)
</script>

<template>
  <div class="layout-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-box" @click="router.push('/')">
          <img src="/logo.png" alt="Cornerstone" class="logo-img" />
          <span class="logo-text">CORNERSTONE</span>
        </div>
      </div>

      <nav class="sidebar-menu">
        <div
            v-for="item in menuItems" :key="item.path"
            class="menu-pill"
            :class="{ active: activePath === item.path }"
            @click="router.push(item.path)"
        >
          <svg class="menu-icon" viewBox="0 0 24 24">
            <path fill="currentColor" :d="item.iconPath" />
          </svg>
          <span class="menu-name">{{ item.name }}</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <template v-if="userStore.isLoggedIn && userStore.userInfo">
          <div v-if="canAccessAdmin" class="menu-pill admin-pill" @click="router.push('/admin')">
            <svg class="menu-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span class="menu-name">管理员系统</span>
          </div>

          <div class="user-pill" @click="router.push('/profile')">
            <img alt="个人头像" :src="userStore.userInfo.avatar_url" class="avatar" />
            <div class="user-info">
              <span class="nickname">{{ userStore.userInfo.nickname }}</span>
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
          <button class="login-pill" @click="isAuthVisible = true">
            登 录 / 注 册
          </button>
        </template>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>

    <AuthModal v-model="isAuthVisible" />
  </div>
</template>

<style scoped>
.layout-container { display: flex; height: 100vh; background-color: #F8F9FB; }
.sidebar {
  width: 240px;
  background-color: #FFFFFF;
  border-right: 1px solid rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  padding: 32px 20px;
  z-index: 100;
  flex-shrink: 0;
}
.logo-box { display: flex; align-items: center; gap: 10px; padding: 0 10px 48px; cursor: pointer; }
.logo-img { width: 28px; height: 28px; }
.logo-text { font-weight: 900; font-size: 16px; color: #00AEEC; letter-spacing: 1px; }
.sidebar-menu { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.menu-pill { display: flex; align-items: center; gap: 14px; padding: 12px 24px; border-radius: 50px; cursor: pointer; transition: all 0.25s ease; color: #606266; font-weight: 500; }
.menu-pill:hover { background-color: rgba(0, 174, 236, 0.05); color: #00AEEC; }
.menu-pill.active { background-color: #00AEEC; color: #FFFFFF; box-shadow: 0 8px 20px rgba(0, 174, 236, 0.2); transform: translateX(4px); }
.menu-icon { width: 20px; height: 20px; flex-shrink: 0; }
.sidebar-footer { padding-top: 20px; border-top: 1px solid #F2F3F5; display: flex; flex-direction: column; gap: 10px; }

.admin-pill { margin-bottom: 4px; }

.user-pill {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background-color: #F4F6F8;
  border-radius: 20px; cursor: pointer; transition: all 0.2s;
}
.user-pill:hover { background-color: #EDF0F3; transform: translateY(-1px); }

.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; }
.user-info { display: flex; flex-direction: column; flex: 1; }
.nickname { font-weight: 600; font-size: 14px; color: #303133; }
.user-tag { font-size: 11px; color: #9499A0; }

/* 底部按钮区域样式优化 */
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

.login-pill {
  width: 100%; padding: 12px; border-radius: 50px; border: none;
  background-image: linear-gradient(135deg, #00AEEC 0%, #00C0FF 100%);
  color: white; font-weight: 700; font-size: 14px; cursor: pointer; transition: transform 0.2s;
}
.login-pill:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 174, 236, 0.3); }

.main-content { flex: 1; overflow-y: auto; padding: 32px 40px; }
</style>