<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'

const userStore = useUserStore()

onMounted(async () => {
  // 应用启动时尝试恢复登录状态
  await userStore.fetchUserInfo()
  if (userStore.isLoggedIn) {
    await userStore.fetchUserRoles()
  }
})
</script>

<template>
  <router-view />
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

body {
  overflow: hidden;
}
</style>
