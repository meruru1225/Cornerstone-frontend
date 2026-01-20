<script setup lang="ts">
import {ref} from 'vue'
import SideBar from '../components/SideBar.vue'
import AuthModal from '../components/AuthModal.vue'

const isAuthVisible = ref(false)

// 简单的处理函数，其实直接写在模板里也可以
const showAuthModal = () => {
  isAuthVisible.value = true
}
</script>

<template>
  <div class="layout-container">
    <SideBar @trigger-auth="showAuthModal"/>

    <main class="main-content">
      <router-view/>
    </main>

    <AuthModal v-model="isAuthVisible"/>
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
</style>