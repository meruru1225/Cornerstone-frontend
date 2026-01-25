<script setup lang="ts">
import { computed } from 'vue'
import type { AdminUserItem, RoleItem } from '../api/user'
import { formatRFC3339ToLocal } from '../utils/time'

const props = defineProps<{
  user: AdminUserItem
  roleOptions?: RoleItem[]
}>()

const emit = defineEmits<{
  (e: 'ban', user: AdminUserItem): void
  (e: 'unban', user: AdminUserItem): void
  (e: 'manage-roles', user: AdminUserItem): void
}>()

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const avatarUrl = computed(() => props.user.user_detail?.avatar_url || defaultAvatar)
const nickname = computed(() => props.user.user_detail?.nickname || props.user.username || '未命名用户')
const bio = computed(() => props.user.user_detail?.bio || '暂无简介')
const genderLabel = computed(() => {
  const gender = props.user.user_detail?.gender ?? 0
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '保密'
})

const roleNames = computed(() => {
  const roles = props.user.user_roles || []
  const map = new Map((props.roleOptions || []).map(role => [role.ID, role.Name]))
  const names = roles.map(role => map.get(role.role_id) || `Role ${role.role_id}`)
  return names.length ? names : ['暂无角色']
})

const handleBanToggle = () => {
  if (props.user.is_ban) {
    emit('unban', props.user)
    return
  }
  emit('ban', props.user)
}

const handleManageRoles = () => {
  emit('manage-roles', props.user)
}
</script>

<template>
  <div class="user-detail-card">
    <div class="detail-header">
      <img :src="avatarUrl" class="avatar" alt="avatar" />
      <div class="header-info">
        <div class="name-row">
          <span class="nickname">{{ nickname }}</span>
          <span class="status-tag" :class="{ banned: user.is_ban }">{{ user.is_ban ? '已封禁' : '正常' }}</span>
        </div>
        <div class="username">@{{ user.username || '未设置用户名' }}</div>
        <div class="bio">{{ bio }}</div>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="handleManageRoles">管理角色</button>
        <button class="danger-btn" v-if="!user.is_ban" @click="handleBanToggle">封禁用户</button>
        <button class="primary-btn" v-else @click="handleBanToggle">解除封禁</button>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-item">
        <span class="label">用户ID</span>
        <span class="value">{{ user.id }}</span>
      </div>
      <div class="detail-item">
        <span class="label">手机号</span>
        <span class="value">{{ user.phone || '-' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">性别</span>
        <span class="value">{{ genderLabel }}</span>
      </div>
      <div class="detail-item">
        <span class="label">地区</span>
        <span class="value">{{ user.user_detail?.region || '-' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">生日</span>
        <span class="value">{{ user.user_detail?.birthday || '-' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">创建时间</span>
        <span class="value">{{ formatRFC3339ToLocal(user.created_at) || '-' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">更新时间</span>
        <span class="value">{{ formatRFC3339ToLocal(user.updated_at) || '-' }}</span>
      </div>
      <div class="detail-item full">
        <span class="label">角色</span>
        <div class="roles">
          <span v-for="name in roleNames" :key="name" class="role-pill">{{ name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-detail-card {
  background: #fff;
  border-radius: 18px;
  padding: 24px;
  border: 1px solid #f1f2f3;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
}

.detail-header {
  display: flex;
  gap: 20px;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname {
  font-size: 18px;
  font-weight: 800;
  color: #18191C;
}

.status-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0, 174, 236, 0.12);
  color: #00AEEC;
}

.status-tag.banned {
  background: rgba(244, 67, 54, 0.12);
  color: #F44336;
}

.username {
  font-size: 13px;
  color: #61666D;
}

.bio {
  font-size: 13px;
  color: #9499A0;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ghost-btn {
  background: #F4F6F8;
  color: #61666D;
  border: none;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}

.danger-btn {
  background: #F56C6C;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}

.detail-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item.full {
  grid-column: span 2;
}

.label {
  font-size: 12px;
  color: #9499A0;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #18191C;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-pill {
  font-size: 12px;
  padding: 4px 10px;
  background: #F4F6F8;
  border-radius: 999px;
  color: #61666D;
}
</style>
