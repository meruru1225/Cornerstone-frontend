<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUserStore } from '../stores/user'
import { formatDateOnly, formatRFC3339ToLocal } from '../utils/time'

const userStore = useUserStore()

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
const userInfo = computed(() => userStore.userInfo)
const roleLabel = computed(() => {
  if (userStore.roles.includes('ADMIN')) return '超级管理员'
  if (userStore.roles.includes('AUDIT')) return '审核员'
  return '管理员'
})

const rules = [
  {
    title: '权限边界',
    desc: '仅在职责范围内处理用户与内容管理请求'
  },
  {
    title: '内容审核',
    desc: '依据平台规范审核，确保公平公正'
  },
  {
    title: '数据保密',
    desc: '不得导出、泄露或传播用户敏感信息'
  },
  {
    title: '操作审慎',
    desc: '封禁、拒绝等高风险操作需二次确认'
  },
  {
    title: '问题反馈',
    desc: '发现异常数据或漏洞及时上报处理'
  }
]

const nowText = ref('')
const nowDate = ref(new Date())
const timer = ref<number | null>(null)

const updateNow = () => {
  const current = new Date()
  nowDate.value = current
  const formatted = formatRFC3339ToLocal(current.toISOString())
  nowText.value = formatted || ''
}

const hourDeg = computed(() => {
  const hours = nowDate.value.getHours() % 12
  const minutes = nowDate.value.getMinutes()
  return (hours + minutes / 60) * 30
})

const minuteDeg = computed(() => {
  const minutes = nowDate.value.getMinutes()
  const seconds = nowDate.value.getSeconds()
  return (minutes + seconds / 60) * 6
})

const secondDeg = computed(() => nowDate.value.getSeconds() * 6)

onMounted(() => {
  updateNow()
  timer.value = window.setInterval(updateNow, 1000)
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})
</script>

<template>
  <div class="admin-view">
    <div class="admin-header">
      <div class="title-area">
        <h2>管理员首页</h2>
        <span class="count">欢迎回来</span>
      </div>
    </div>

    <div class="home-grid">
      <div class="profile-card">
        <div class="profile-header">
          <img :src="userInfo?.avatar_url || defaultAvatar" class="avatar" />
          <div class="profile-info">
            <div class="name-row">
              <span class="nickname">{{ userInfo?.nickname || userInfo?.username || '管理员' }}</span>
              <span class="role-tag">{{ roleLabel }}</span>
            </div>
            <div class="username">@{{ userInfo?.username || '-' }}</div>
          </div>
        </div>

        <div class="profile-grid">
          <div class="profile-item">
            <span class="label">手机号</span>
            <span class="value">{{ userInfo?.phone || '-' }}</span>
          </div>
          <div class="profile-item">
            <span class="label">地区</span>
            <span class="value">{{ userInfo?.region || '-' }}</span>
          </div>
          <div class="profile-item">
            <span class="label">生日</span>
            <span class="value">{{ formatDateOnly(userInfo?.birthday || '') || '-' }}</span>
          </div>
          <div class="profile-item">
            <span class="label">注册时间</span>
            <span class="value">{{ formatRFC3339ToLocal(userInfo?.created_at || '') || '-' }}</span>
          </div>
        </div>

        <div class="clock-card">
          <div class="clock-face">
            <div class="clock-hand hour" :style="{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }"></div>
            <div class="clock-hand minute" :style="{ transform: `translate(-50%, -100%) rotate(${minuteDeg}deg)` }"></div>
            <div class="clock-hand second" :style="{ transform: `translate(-50%, -100%) rotate(${secondDeg}deg)` }"></div>
            <div class="clock-center"></div>
          </div>
          <div class="clock-info">
            <div class="clock-title">当前时间</div>
            <div class="clock-time">{{ nowText || '-' }}</div>
          </div>
        </div>
      </div>

      <div class="rules-card">
        <div class="card-title">管理员守则</div>
        <div class="rules-list">
          <div v-for="rule in rules" :key="rule.title" class="rule-item">
            <div class="rule-title">{{ rule.title }}</div>
            <div class="rule-desc">{{ rule.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-view {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-area h2 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  color: #18191C;
}

.count {
  font-size: 13px;
  color: #9499A0;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
}

.profile-card,
.rules-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  border: 1px solid #f1f2f3;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.profile-info {
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

.role-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0, 174, 236, 0.12);
  color: #00AEEC;
}

.username {
  font-size: 13px;
  color: #61666D;
}

.profile-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clock-card {
  margin-top: 32px;
  border-radius: 16px;
  border: 1px solid #e6e8ec;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  background: #ffffff;
}

.clock-face {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 2px solid #111111;
  background: #ffffff;
}

.clock-hand {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: 50% 100%;
  background: #111111;
  border-radius: 999px;
}

.clock-hand.hour {
  width: 4px;
  height: 32px;
}

.clock-hand.minute {
  width: 3px;
  height: 42px;
  background: #1f1f1f;
}

.clock-hand.second {
  width: 2px;
  height: 46px;
  background: #000000;
}

.clock-center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  background: #111111;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.clock-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clock-title {
  font-size: 13px;
  color: #8b8f97;
  font-weight: 600;
}

.clock-time {
  font-size: 20px;
  font-weight: 800;
  color: #18191c;
  letter-spacing: 0.4px;
}

.label {
  font-size: 12px;
  color: #9499A0;
}

.value {
  font-size: 14px;
  color: #18191C;
  font-weight: 600;
}

.card-title {
  font-size: 16px;
  font-weight: 800;
  color: #18191C;
  margin-bottom: 16px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rule-item {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #E3E5E7;
  background: #F8F9FA;
}

.rule-title {
  font-size: 14px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 6px;
}

.rule-desc {
  font-size: 12px;
  color: #9499A0;
}

@media (max-width: 980px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}
</style>
