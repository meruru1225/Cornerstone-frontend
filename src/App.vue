<script setup lang="ts">
import {onMounted, watch} from 'vue'
import {useUserStore} from './stores/user'
import {imClient} from './api/im'

const userStore = useUserStore()

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
})

// 登录状态变化时重新连接
watch(() => userStore.isLoggedIn, (val) => {
  if (val) startIM()
  else stopIM()
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
