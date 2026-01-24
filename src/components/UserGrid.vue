<script setup lang="ts">
import UserCard from './UserCard.vue'
import type { UserHomeInfo } from '../api/user'

defineProps<{
  users: UserHomeInfo[]
  loading?: boolean
}>()
</script>

<template>
  <div class="user-grid-wrapper">
    <div v-if="loading" class="loading-placeholder">
      <div class="spinner"></div>
    </div>

    <div v-else class="user-list">
      <UserCard
          v-for="user in users"
          :key="user.user_id"
          :user="user"
      />
    </div>
  </div>
</template>

<style scoped>
.user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); /* 响应式 Grid */
  gap: 16px;
}

.loading-placeholder {
  display: flex;
  justify-content: center;
  padding: 50px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #00AEEC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
