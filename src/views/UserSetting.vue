<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  changeUsernameApi,
  changePasswordApi,
  changePhoneApi,
  cancelAccountApi
} from '../api/user'
import { sendCodeApi } from '../api/auth'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// --- 修改用户名 ---
const usernameForm = reactive({ username: '' })
const loadingUsername = ref(false)

const handleUpdateUsername = async () => {
  const newUsername = usernameForm.username.trim()
  if (!newUsername) return ElMessage.warning('请输入新的用户名')
  if (newUsername === userStore?.userInfo?.username) return ElMessage.warning('新用户名不能与当前相同')
  
  // 简单的格式校验：3-20位，支持字母、数字、下划线
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(newUsername)) {
    return ElMessage.warning('用户名需为3-20位字母、数字或下划线')
  }

  loadingUsername.value = true
  try {
    await changeUsernameApi({ username: newUsername })
    ElMessage.success('用户名修改成功')
    await userStore.fetchUserInfo()
    usernameForm.username = ''
  } catch (error: any) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    loadingUsername.value = false
  }
}

// --- 修改密码 ---
const pwdForm = reactive({ old_password: '', new_password: '', confirm: '' })
const loadingPwd = ref(false)

const handleUpdatePassword = async () => {
  if (!pwdForm.new_password) return ElMessage.warning('请输入新密码')

  loadingPwd.value = true
  try {
    await changePasswordApi({
      old_password: pwdForm.old_password,
      new_password: pwdForm.new_password
    })
    ElMessage.success('密码修改成功，请重新登录')
    await userStore.logout()
    await router.push('/')
  } catch (error: any) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    loadingPwd.value = false
  }
}

// --- 换绑手机 ---
const phoneForm = reactive({ new_phone: '', code: '' })
const loadingPhone = ref(false)
const countdown = ref(0)

const sendCode = async () => {
  if (!phoneForm.new_phone) return ElMessage.warning('请输入新手机号')
  if (!/^1[3-9]\d{9}$/.test(phoneForm.new_phone)) return ElMessage.warning('手机号格式不正确')

  if (countdown.value > 0) return

  try {
    await sendCodeApi(phoneForm.new_phone)
    ElMessage.success('验证码已发送')
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch (error: any) {
    ElMessage.error(error.message || '发送失败')
  }
}

const handleUpdatePhone = async () => {
  if (!phoneForm.new_phone || !phoneForm.code) return ElMessage.warning('请填写手机号和验证码')

  loadingPhone.value = true
  try {
    // 假设后端接口参数 token 即为验证码 code
    await changePhoneApi({
      new_phone: phoneForm.new_phone,
      token: phoneForm.code
    })
    ElMessage.success('手机号绑定成功')
    await userStore.fetchUserInfo()
    phoneForm.new_phone = ''
    phoneForm.code = ''
  } catch (error: any) {
    ElMessage.error(error.message || '绑定失败')
  } finally {
    loadingPhone.value = false
  }
}

// --- 注销账号 ---
const handleCancelAccount = () => {
  ElMessageBox.confirm(
      '注销后您的所有数据将被永久删除且无法恢复，是否确认注销？',
      '危险操作',
      {
        confirmButtonText: '确认注销',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
  ).then(async () => {
    try {
      await cancelAccountApi()
      ElMessage.success('账号已注销')
      await userStore.logout()
      await router.push('/')
    } catch (error: any) {
      ElMessage.error(error.message || '注销失败')
    }
  })
}

const goBack = () => router.back()
</script>

<template>
  <div class="setting-view">
    <div class="nav-header">
      <button class="back-link" @click="goBack">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        返回个人主页
      </button>
    </div>

    <div class="setting-card">
      <header class="card-header">
        <h1 class="card-title">账号设置</h1>
        <p class="card-desc">管理您的账号安全与绑定信息</p>
      </header>

      <section class="setting-section">
        <h3 class="section-title">修改用户名</h3>
        <div class="form-row">
          <div class="g-input-item flex-grow">
            <input type="text" v-model="usernameForm.username"
                   :placeholder="`当前: ${userStore?.userInfo?.username || '未设置'}`"/>
          </div>
          <button class="btn-mini primary" :disabled="loadingUsername" @click="handleUpdateUsername">
            {{ loadingUsername ? '保存中...' : '修改' }}
          </button>
        </div>
      </section>

      <section class="setting-section">
        <h3 class="section-title">安全密码</h3>
        <p class="section-hint">如果未设置密码，则当前密码置空</p>

        <div class="g-input-item">
          <input type="password" v-model="pwdForm.old_password" placeholder="当前密码"/>
        </div>
        <div class="g-input-item">
          <input type="password" v-model="pwdForm.new_password" placeholder="新密码 (至少6位)"/>
        </div>
        <div class="g-input-item">
          <input type="password" v-model="pwdForm.confirm" placeholder="确认新密码"/>
        </div>
        <div class="action-right">
          <button class="g-main-btn sm-btn" :disabled="loadingPwd" @click="handleUpdatePassword">
            {{ loadingPwd ? '提交中...' : '重置密码' }}
          </button>
        </div>
      </section>

      <section class="setting-section">
        <h3 class="section-title">绑定手机</h3>
        <div class="g-input-item">
          <input type="text" v-model="phoneForm.new_phone" placeholder="新手机号码"/>
        </div>
        <div class="g-input-item sms-row">
          <input type="text" v-model="phoneForm.code" placeholder="短信验证码"/>
          <button class="code-btn" :disabled="countdown > 0" @click="sendCode">
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>
        <div class="action-right">
          <button class="g-main-btn sm-btn" :disabled="loadingPhone" @click="handleUpdatePhone">
            {{ loadingPhone ? '提交中...' : '确认换绑' }}
          </button>
        </div>
      </section>

      <section class="setting-section danger-zone">
        <div class="danger-info">
          <h4>注销账号</h4>
          <p>此操作不可逆，您的所有数据将被删除。</p>
        </div>
        <button class="btn-mini danger" @click="handleCancelAccount">注销</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.setting-view {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.nav-header {
  margin-bottom: 20px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #61666D;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
}

.back-link:hover {
  color: #00AEEC;
}

.setting-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f1f2f3;
  padding: 40px;
}

.card-header {
  margin-bottom: 40px;
  text-align: center;
  border-bottom: 1px solid #f7f7f7;
  padding-bottom: 30px;
}

.card-title {
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
  margin-bottom: 8px;
}

.card-desc {
  color: #9499A0;
  font-size: 14px;
}

.setting-section {
  margin-bottom: 40px;
}

.section-hint {
  font-size: 12px;
  color: #9499A0;
  margin-bottom: 12px;
  padding-left: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background: #00AEEC;
  border-radius: 2px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-grow {
  flex: 1;
}

.action-right {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.g-main-btn.sm-btn {
  width: auto;
  padding: 0 30px;
  height: 40px;
  font-size: 14px;
}

.btn-mini {
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-mini.primary {
  background: rgba(0, 174, 236, 0.1);
  color: #00AEEC;
}

.btn-mini.primary:hover:not(:disabled) {
  background: #00AEEC;
  color: #fff;
}

.btn-mini.danger {
  background: rgba(255, 71, 87, 0.1);
  color: #FF4757;
  height: 36px;
}

.btn-mini.danger:hover {
  background: #FF4757;
  color: #fff;
}

.sms-row {
  padding-right: 6px;
}

.code-btn {
  height: 36px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: #00AEEC;
  font-size: 13px;
  cursor: pointer;
  border-left: 1px solid #eee;
  margin-left: 8px;
}

.code-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.danger-zone {
  margin-top: 60px;
  padding-top: 30px;
  border-top: 1px solid #f7f7f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.danger-info h4 {
  color: #FF4757;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.danger-info p {
  color: #9499A0;
  font-size: 13px;
}
</style>