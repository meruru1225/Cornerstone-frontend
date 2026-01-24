<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { UserHomeInfo } from '../api/user'

const props = withDefaults(defineProps<{
  user: UserHomeInfo
  disableNavigate?: boolean
  actionLabel?: string
  showAction?: boolean
}>(), {
  disableNavigate: false,
  actionLabel: '访问主页',
  showAction: true
})

const emit = defineEmits<{
  (e: 'select', user: UserHomeInfo): void
}>()

const router = useRouter()

const handleClick = () => {
  if (props.disableNavigate) {
    emit('select', props.user)
    return
  }
  router.push({ path: '/space', query: { id: props.user.user_id.toString() } })
}

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
</script>

<template>
  <div class="user-card" @click="handleClick">
    <div class="avatar-wrapper">
      <img :src="user.avatar_url || defaultAvatar" class="avatar" alt="avatar" />
    </div>

    <div class="info-wrapper">
      <div class="top-row">
        <span class="nickname" v-html="user.nickname"></span>
        <span class="gender-badge" v-if="user.gender !== 0">
          {{ user.gender === 1 ? '♂' : '♀' }}
        </span>
      </div>
      <div class="bio-row">
        {{ user.bio || '这个人很懒，什么都没有写~' }}
      </div>
    </div>

    <div v-if="showAction" class="action-wrapper">
      <button class="visit-btn">{{ actionLabel }}</button>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f1f2f3;
  transition: all 0.2s ease;
  cursor: pointer;
  gap: 16px;
}

.user-card:hover {
  border-color: #00AEEC;
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.08);
  transform: translateY(-2px);
}

.avatar-wrapper .avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.info-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname {
  font-size: 16px;
  font-weight: 600;
  color: #18191C;
}

.gender-badge {
  font-size: 12px;
  padding: 0 6px;
  border-radius: 8px;
  background: #f1f2f3;
  color: #9499A0;
}

.bio-row {
  font-size: 13px;
  color: #9499A0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-btn {
  padding: 6px 16px;
  border-radius: 18px;
  border: 1px solid #00AEEC;
  color: #00AEEC;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.visit-btn:hover {
  background: #00AEEC;
  color: #fff;
}
</style>
