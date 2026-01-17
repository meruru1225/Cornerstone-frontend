<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
}

type Mode = 'login' | 'register' | 'forget'
type LoginMethod = 'password' | 'sms'

const currentMode = ref<Mode>('login')
const loginMethod = ref<LoginMethod>('password')
const isPasswordFocus = ref(false)
const isLoading = ref(false)
const countdown = ref(0)
const registerStep = ref(1)

const formData = reactive({
  account: '',
  password: '',
  confirmPassword: '',
  smsCode: '',
  nickname: '',
  gender: 1,
  birthday: null as Date | null,
  region: '',
  bio: ''
})

const isRegister = computed(() => currentMode.value === 'register')
const isForget = computed(() => currentMode.value === 'forget')

const buttonText = computed(() => {
  if (isLoading.value) return '提交中...'
  if (isRegister.value) {
    return registerStep.value === 1 ? '下一步' : '完成注册'
  }
  if (isForget.value) {
    return '重置密码'
  }
  return '登 录'
})

const showMsg = (type: 'success' | 'warning' | 'error', message: string) => {
  ElMessage({ type, message, grouping: true })
}

const toggleMode = (mode: Mode) => {
  currentMode.value = mode
  isPasswordFocus.value = false
  registerStep.value = 1
  formData.password = ''
  formData.confirmPassword = ''
  formData.smsCode = ''
}

const sendCode = () => {
  if (!formData.account) return showMsg('warning', '请输入手机号')
  if (!/^1[3-9]\d{9}$/.test(formData.account)) return showMsg('warning', '请输入正确的手机号')
  if (countdown.value > 0) return
  showMsg('success', '验证码已发送: 571849')
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const handleSubmit = async () => {
  if (currentMode.value === 'login') {
    if (!formData.account) return showMsg('warning', '请输入账号')
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      showMsg('success', '欢迎回来！登录成功')
      close()
    } finally {
      isLoading.value = false
    }
    return
  }

  if (currentMode.value === 'forget') {
    if (!formData.account) return showMsg('warning', '请输入手机号')
    if (!formData.smsCode) return showMsg('warning', '请输入验证码')
    if (!formData.password) return showMsg('warning', '请输入新密码')
    if (formData.password !== formData.confirmPassword) return showMsg('error', '两次密码输入不一致')
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      showMsg('success', '密码重置成功，请重新登录')
      toggleMode('login')
    } finally {
      isLoading.value = false
    }
    return
  }

  if (currentMode.value === 'register') {
    if (registerStep.value === 1) {
      if (!formData.account || !formData.password) return showMsg('warning', '请完善账号密码信息')
      if (formData.password !== formData.confirmPassword) return showMsg('error', '两次密码输入不一致')
      registerStep.value = 2
      return
    }
    if (registerStep.value === 2) {
      if (!formData.nickname) return showMsg('warning', '给自己起个好听的名字吧')
      isLoading.value = true
      try {
        await new Promise(resolve => setTimeout(resolve, 1500))
        showMsg('success', '注册成功！欢迎加入 Cornerstone')
        toggleMode('login')
      } finally {
        isLoading.value = false
      }
    }
  }
}

const prevStep = () => {
  registerStep.value = 1
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-auth">
      <div v-if="props.modelValue" class="page-container" @click.self="close">
        <div class="bg-shape shape-1"></div>
        <div class="bg-shape shape-2"></div>
        <div class="bg-shape shape-3"></div>

        <div class="auth-card">
          <button class="close-btn" @click="close">×</button>

          <div class="card-side">
            <div class="brand-group">
              <div class="brand-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="8" width="18" height="12" rx="3"></rect>
                  <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <h2>CORNERSTONE</h2>
            </div>
            <div class="slogan-area">
              <h3>标记生活 遇见同好</h3>
              <p class="sub-text">Share Your Life Moments</p>
              <div class="tags-cloud">
                <span class="tag">#旅行</span>
                <span class="tag">#穿搭</span>
                <span class="tag">#美食</span>
              </div>
            </div>
            <div class="decor-blocks">
              <div class="d-block d1"></div>
              <div class="d-block d2"></div>
            </div>
          </div>

          <div class="card-main">
            <div class="mascot-stage">
              <div class="mascot-float-wrapper">
                <div class="mascot-body" :class="{ 'is-shy': isPasswordFocus }">
                  <div class="plant-sprout">
                    <div class="leaf left"></div>
                    <div class="leaf right"></div>
                  </div>
                  <div class="face front">
                    <div class="facial-features">
                      <div class="eyes">
                        <div class="eye left"></div>
                        <div class="eye right"></div>
                      </div>
                      <div class="mouth"></div>
                      <div class="blushs"></div>
                    </div>
                  </div>
                  <div class="face face-left"></div>
                  <div class="face face-right"></div>
                  <div class="face face-top"></div>
                  <div class="face face-bottom"></div>
                </div>
              </div>
              <div class="shadow-base"></div>
            </div>

            <div class="form-wrapper">
              <div class="header">
                <h3>
                  <span v-if="currentMode === 'login'">欢迎回家</span>
                  <span v-else-if="currentMode === 'forget'">找回密码</span>
                  <span v-else>{{ registerStep === 1 ? '创建账号' : '完善资料' }}</span>
                </h3>
                <div class="login-type-switch" v-if="currentMode === 'login'">
                  <span :class="{ active: loginMethod === 'password' }" @click="loginMethod = 'password'">密码登录</span>
                  <span class="divider">/</span>
                  <span :class="{ active: loginMethod === 'sms' }" @click="loginMethod = 'sms'">验证码登录</span>
                </div>
                <div class="step-indicator" v-if="currentMode === 'register'">
                  <span :class="{ active: registerStep === 1 }">1</span>
                  <span class="dots">···</span>
                  <span :class="{ active: registerStep === 2 }">2</span>
                </div>
                <div class="login-type-switch" v-if="currentMode === 'forget'">
                  <span class="link-btn" @click="toggleMode('login')">返回登录</span>
                </div>
              </div>

              <div class="form-body">
                <div v-if="currentMode !== 'register' || registerStep === 1" class="step-fade">
                  <div class="input-group">
                    <div class="input-item">
                      <svg class="icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      <input type="text" v-model="formData.account" placeholder="请输入手机号"/>
                    </div>
                    <div class="input-item sms-mode" v-if="(currentMode === 'login' && loginMethod === 'sms') || currentMode === 'forget'">
                      <svg class="icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                      </svg>
                      <input type="text" v-model="formData.smsCode" placeholder="验证码"/>
                      <button class="fetch-btn" :disabled="countdown > 0" @click="sendCode">
                        {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                      </button>
                    </div>
                    <template v-if="(currentMode === 'login' && loginMethod === 'password') || currentMode === 'register' || currentMode === 'forget'">
                      <div class="input-item">
                        <svg class="icon" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <input type="password" v-model="formData.password" :placeholder="currentMode === 'forget' ? '请输入新密码' : '请输入密码'" @focus="isPasswordFocus = true" @blur="isPasswordFocus = false" />
                      </div>
                    </template>
                    <div class="input-item" v-if="currentMode === 'register' || currentMode === 'forget'">
                      <svg class="icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7z"/>
                      </svg>
                      <input type="password" v-model="formData.confirmPassword" placeholder="再次确认密码" @focus="isPasswordFocus = true" @blur="isPasswordFocus = false" />
                    </div>
                  </div>
                  <div class="options-row" v-if="currentMode === 'login'">
                    <label class="check-label"><input type="checkbox"> <span>记住我</span></label>
                    <span class="link-btn" @click="toggleMode('forget')">忘记密码?</span>
                  </div>
                </div>

                <div v-else class="step-fade">
                  <div class="input-group">
                    <div class="input-item">
                      <svg class="icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                      <input type="text" v-model="formData.nickname" placeholder="昵称 (必填)"/>
                    </div>
                    <div class="row-2-col">
                      <div class="input-item small date-wrapper">
                        <svg class="icon date-icon" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                        </svg>
                        <VueDatePicker v-model="formData.birthday" :locale="zhCN" :format-locale="zhCN" :enable-time-picker="false" auto-apply format="yyyy/MM/dd" placeholder="生日" :teleport="true" />
                      </div>
                      <div class="input-item small">
                        <input type="text" v-model="formData.region" placeholder="城市"/>
                      </div>
                    </div>
                    <div class="gender-selector">
                      <div class="gender-option" :class="{ active: formData.gender === 1 }" @click="formData.gender = 1">♂ 男生</div>
                      <div class="gender-option" :class="{ active: formData.gender === 2 }" @click="formData.gender = 2">♀ 女生</div>
                      <div class="gender-option" :class="{ active: formData.gender === 0 }" @click="formData.gender = 0">? 保密</div>
                    </div>
                    <div class="input-item textarea-item">
                      <textarea v-model="formData.bio" placeholder="写一句个性签名吧..."></textarea>
                    </div>
                  </div>
                  <div class="options-row center">
                    <span class="link-btn" @click="prevStep">返回上一步</span>
                  </div>
                </div>
              </div>

              <button class="main-btn" :disabled="isLoading" @click="handleSubmit">
                {{ buttonText }}
              </button>

              <div class="bottom-tips" v-if="currentMode !== 'register' || registerStep === 1">
                <template v-if="currentMode === 'login'">
                  还没有账号？<span class="action" @click="toggleMode('register')">注册新账号</span>
                </template>
                <template v-else>
                  已有账号？<span class="action" @click="toggleMode('login')">直接登录</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 容器固定定位，调整为几乎透明的毛玻璃效果 */
.page-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  /* 显著降低背景透明度 */
  background-color: rgba(241, 242, 245, 0.3);
  /* 降低模糊半径，使其更清亮 */
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  overflow: hidden;
}

/* 右上角关闭按钮 */
.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  color: #9499a0;
  cursor: pointer;
  z-index: 100;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #18191c;
}

:root {
  --primary: #00aeec;
  --primary-deep: #009cd6;
  --text-main: #18191c;
  --text-sub: #9499a0;
  --input-bg: #f7f8fa;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  z-index: 0;
}

.shape-1 {
  width: 800px;
  height: 800px;
  background-color: rgba(0, 174, 236, 0.12);
  top: -300px;
  left: -200px;
}

.shape-2 {
  width: 600px;
  height: 600px;
  background-color: rgba(251, 114, 153, 0.1);
  bottom: -200px;
  right: -100px;
}

.shape-3 {
  width: 500px;
  height: 500px;
  background-color: rgba(150, 90, 255, 0.12);
  top: -100px;
  right: -150px;
  animation: breathe 8s infinite ease-in-out;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.auth-card {
  position: relative;
  z-index: 10;
  width: 1080px;
  min-height: 520px;
  background-color: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06);
  display: flex;
  overflow: hidden;
}

.card-side {
  width: 40%;
  background-image: linear-gradient(135deg, #00aeec 0%, #00c0ff 100%);
  padding: 60px 50px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.brand-logo {
  width: 44px;
  height: 44px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.brand-group h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
}

.slogan-area {
  z-index: 2;
  margin-bottom: 60px;
}

.slogan-area h3 {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 15px;
  line-height: 1.2;
}

.slogan-area .sub-text {
  font-size: 16px;
  opacity: 0.85;
  font-weight: 300;
  letter-spacing: 1px;
}

.tags-cloud {
  margin-top: 30px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag {
  font-size: 13px;
  padding: 6px 14px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.d-block {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(5px);
}

.d1 {
  width: 140px;
  height: 140px;
  top: -20px;
  right: -20px;
  transform: rotate(15deg);
}

.d2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  transform: rotate(-10deg);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.card-main {
  width: 60%;
  padding: 40px 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.mascot-stage {
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  perspective: 800px;
  margin-bottom: 20px;
}

.mascot-float-wrapper {
  width: 70px;
  height: 70px;
  transform-style: preserve-3d;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.mascot-body {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(-10deg) rotateY(-25deg);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mascot-body.is-shy {
  transform: rotateX(10deg) rotateY(0deg) translateY(5px);
}

.face {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 4px;
  outline: 1px solid;
}

.front {
  transform: translateZ(35px);
  background-color: #fb7299;
  outline-color: #fb7299;
  display: flex;
  align-items: center;
  justify-content: center;
}

.face-left {
  transform: rotateY(-90deg) translateZ(35px);
  background-color: #e45a82;
  outline-color: #e45a82;
}

.face-right {
  transform: rotateY(90deg) translateZ(35px);
  background-color: #e45a82;
  outline-color: #e45a82;
}

.face-top {
  transform: rotateX(90deg) translateZ(35px);
  background-color: #ff9eb9;
  outline-color: #ff9eb9;
}

.face-bottom {
  transform: rotateX(-90deg) translateZ(35px);
  background-color: #c2456b;
  outline-color: #c2456b;
}

.mascot-body.is-shy .eye {
  height: 3px;
  transform: scaleX(1.3);
  border-radius: 2px;
}

.mascot-body.is-shy .mouth {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.plant-sprout {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%) translateZ(35px);
  width: 20px;
  height: 20px;
}

.leaf {
  position: absolute;
  bottom: 0;
  width: 10px;
  height: 18px;
  background-color: #87d068;
  border-top-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.leaf.left {
  left: 0;
  transform: rotate(-30deg);
}

.leaf.right {
  right: 0;
  transform: rotate(30deg) scaleX(-1);
}

.facial-features {
  width: 44px;
  position: relative;
}

.eyes {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.eye {
  width: 10px;
  height: 10px;
  background-color: #333;
  border-radius: 50%;
  animation: blink 4s infinite;
}

.mouth {
  width: 8px;
  height: 4px;
  background-color: #333;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  margin: 0 auto;
  opacity: 0.8;
}

.blushs {
  position: absolute;
  top: 12px;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.blushs::before,
.blushs::after {
  content: '';
  width: 8px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  display: block;
}

.shadow-base {
  position: absolute;
  width: 50px;
  height: 10px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  bottom: 10px;
  filter: blur(4px);
  animation: shadow-scale 4s infinite ease-in-out;
}

@keyframes shadow-scale {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(0.8); opacity: 0.1; }
}

@keyframes blink {
  0%, 96%, 100% { transform: scaleY(1); }
  98% { transform: scaleY(0.1); }
}

/* 表单包装器 */
.form-wrapper {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 25px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.header h3 {
  font-size: 24px;
  color: var(--text-main);
  font-weight: bold;
}

.login-type-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-sub);
}

.login-type-switch span {
  cursor: pointer;
  transition: color 0.3s;
}

.login-type-switch span:hover {
  color: var(--primary);
}

.login-type-switch span.active {
  color: var(--primary);
  font-weight: 600;
  font-size: 15px;
}

.divider {
  font-size: 12px;
  color: #e0e0e0;
  cursor: default !important;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-sub);
  font-size: 14px;
}

.step-indicator span.active {
  color: var(--primary);
  font-weight: bold;
  font-size: 18px;
}

.dots {
  margin: 0 5px;
  color: #e0e0e0;
}

/* 输入项样式 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 25px;
}

.input-item {
  position: relative;
  height: 48px;
  background-color: var(--input-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.input-item:focus-within {
  background-color: #fff;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 174, 236, 0.1);
}

.input-item .icon {
  width: 20px;
  height: 20px;
  color: #c0c4cc;
  margin-right: 12px;
  flex-shrink: 0;
}

.input-item input {
  flex: 1;
  border: none;
  background-color: transparent;
  font-size: 14px;
  height: 100%;
  outline: none;
  color: var(--text-main);
}

.sms-mode {
  padding-right: 8px;
}

.fetch-btn {
  height: 32px;
  padding: 0 12px;
  border: none;
  background-color: rgba(0, 174, 236, 0.1);
  color: var(--primary);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.fetch-btn:hover:not(:disabled) {
  background-color: rgba(0, 174, 236, 0.2);
}

.fetch-btn:disabled {
  background-color: #eee;
  color: #ccc;
  cursor: not-allowed;
}

.row-2-col {
  display: flex;
  gap: 10px;
}

.input-item.small {
  flex: 1;
  min-width: 0;
}

.date-wrapper {
  padding-right: 8px;
}

.date-icon {
  color: #c0c4cc;
}

.gender-selector {
  display: flex;
  gap: 10px;
}

.gender-option {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--input-bg);
  border-radius: 8px;
  color: var(--text-sub);
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.gender-option:hover {
  background-color: #edf1f5;
}

.gender-option.active {
  background-color: rgba(0, 174, 236, 0.1);
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 500;
}

.textarea-item {
  height: auto;
  padding: 12px 16px;
  align-items: flex-start;
}

.textarea-item textarea {
  width: 100%;
  height: 60px;
  border: none;
  background-color: transparent;
  resize: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-main);
}

.options-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 25px;
}

.options-row.center {
  justify-content: center;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.check-label input {
  accent-color: var(--primary);
}

.link-btn {
  color: var(--text-sub);
  text-decoration: none;
  cursor: pointer;
}

.link-btn:hover {
  color: var(--primary);
}

.main-btn {
  width: 100%;
  height: 48px;
  background-color: #00aeec !important;
  color: #ffffff !important;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 16px rgba(0, 174, 236, 0.3);
}

.main-btn:hover {
  background-color: #009cd6 !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 174, 236, 0.4);
}

.main-btn:active {
  transform: translateY(0);
}

.main-btn:disabled {
  background-color: #a0dfff !important;
  cursor: not-allowed;
  box-shadow: none;
}

.bottom-tips {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-sub);
}

.action {
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  margin-left: 5px;
}

.action:hover {
  text-decoration: underline;
}

.step-fade {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>