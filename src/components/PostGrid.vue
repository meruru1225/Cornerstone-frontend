<script setup lang="ts">
import PostCard from './PostCard.vue'
import {type PostItem} from '../api/post'

defineProps<{
  posts: PostItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'post-click', id: number): void
}>()
</script>

<template>
  <div class="grid-wrapper">
    <div v-if="loading" class="loading-placeholder">
      <div class="spinner"></div>
    </div>
    <div v-else class="post-grid">
      <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @click="(id) => emit('post-click', id)"
      />
    </div>
  </div>
</template>

<style scoped>
.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  align-items: start;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>