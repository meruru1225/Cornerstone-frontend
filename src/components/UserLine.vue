<script setup lang="ts">
import { computed } from 'vue'
import type { AdminUserItem } from '../api/user'

const props = defineProps<{
  user: AdminUserItem
}>()

const emit = defineEmits<{
  (e: 'assign', user: AdminUserItem): void
}>()

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const avatarUrl = computed(() => props.user.user_detail?.avatar_url || defaultAvatar)
const nickname = computed(() => props.user.user_detail?.nickname || props.user.username || '未命名用户')
const bio = computed(() => props.user.user_detail?.bio || '暂无简介')

const handleAssign = (event: MouseEvent) => {
  event.stopPropagation()
  emit('assign', props.user)
}
</script>

<template>
  <div class="admin-user-line">
    <div class="avatar-wrapper">
      <img :src="avatarUrl" class="avatar" alt="avatar" />
    </div>

    <div class="info-wrapper">
      <div class="top-row">
        <span class="nickname">{{ nickname }}</span>
        <span class="user-id">ID {{ user.id }}</span>
      </div>
      <div class="bio-row">{{ bio }}</div>
    </div>

    <div class="action-wrapper">
      <button class="primary-btn" @click="handleAssign">分配权限</button>
    </div>
  </div>
</template>

<style scoped>
.admin-user-line {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #f1f2f3;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
}

.avatar-wrapper .avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.info-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.top-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname {
  font-size: 16px;
  font-weight: 700;
  color: #18191C;
}

.user-id {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #F4F6F8;
  color: #61666D;
}

.bio-row {
  font-size: 13px;
  color: #9499A0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}
</style>
