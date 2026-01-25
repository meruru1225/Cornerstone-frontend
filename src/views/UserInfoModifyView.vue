<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import {useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {
  getUserInfoApi,
  updateUserInfoApi,
  uploadAvatarApi,
  type UpdateUserInfoParams
} from '../api/user'
import {useUserStore} from '../stores/user'
import {formatDateOnly} from '../utils/time'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')

const form = reactive({
  nickname: '',
  bio: '',
  gender: 0,
  birthday: '',
  region: ''
})

const initData = async () => {
  loading.value = true
  try {
    const res: any = await getUserInfoApi()
    const data = res.data
    form.nickname = data.nickname
    form.bio = data.bio
    form.gender = data.gender
    form.birthday = formatDateOnly(data.birthday)
    form.region = data.region
    avatarPreview.value = data.avatar_url
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

const handleAvatarChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.warning('头像大小不能超过 2MB')
      return
    }
    avatarFile.value = file
    avatarPreview.value = URL.createObjectURL(file)
  }
}

const triggerAvatarInput = () => {
  document.getElementById('avatar-input')?.click()
}

const handleSave = async () => {
  if (!form.nickname?.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  saving.value = true
  try {
    if (avatarFile.value) {
      const formData = new FormData()
      formData.append('file', avatarFile.value)
      await uploadAvatarApi(formData)
    }

    const submitData: UpdateUserInfoParams = {
      ...form,
      birthday: form.birthday || undefined
    }

    await updateUserInfoApi(submitData)
    ElMessage.success('保存成功')
    await userStore.fetchUserInfo()
    setTimeout(() => {
      router.back()
    }, 500)
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.back()
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="modify-view">
    <div class="nav-header">
      <button class="back-link" @click="handleCancel">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        返回个人主页
      </button>
    </div>

    <div class="modify-card">
      <header class="card-header">
        <h1 class="card-title">编辑资料</h1>
        <p class="card-desc">完善您的信息，展示独特的自己</p>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="form-content">
        <div class="avatar-section">
          <div class="avatar-wrapper" @click="triggerAvatarInput">
            <img :src="avatarPreview || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
                 class="avatar-img"/>
            <div class="avatar-mask">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#fff"
                      d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3.6 2l.8-2h9.2l.8 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h1.6zM12 19c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-2c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
              </svg>
            </div>
          </div>
          <input type="file" id="avatar-input" accept="image/*" @change="handleAvatarChange" hidden/>
          <div class="avatar-tip">点击更换头像</div>
        </div>

        <div class="form-group">
          <label class="form-label">昵称</label>
          <div class="g-input-item">
            <input type="text" v-model="form.nickname" placeholder="请输入昵称" maxlength="20"/>
            <span class="word-count">{{ form.nickname?.length || 0 }}/20</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">个人简介</label>
          <div class="g-input-item textarea-item">
            <textarea v-model="form.bio" placeholder="介绍一下自己吧..." rows="4" maxlength="100"></textarea>
            <span class="word-count">{{ form.bio?.length || 0 }}/100</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">性别</label>
            <div class="g-gender-selector">
              <div class="g-gender-option" :class="{ active: form.gender === 1 }" @click="form.gender = 1">♂ 男生</div>
              <div class="g-gender-option" :class="{ active: form.gender === 2 }" @click="form.gender = 2">♀ 女生</div>
              <div class="g-gender-option" :class="{ active: form.gender === 0 }" @click="form.gender = 0">? 保密</div>
            </div>
          </div>

          <div class="form-group half">
            <label class="form-label">生日</label>
            <div class="g-input-item date-wrapper">
              <svg class="icon date-icon" viewBox="0 0 24 24">
                <path fill="currentColor"
                      d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <el-date-picker
                  v-model="form.birthday"
                  type="date"
                  placeholder="选择生日"
                  format="YYYY年MM月DD日"
                  value-format="YYYY-MM-DD"
                  :editable="false"
                  :clearable="false"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">地区</label>
          <div class="g-input-item">
            <input type="text" v-model="form.region" placeholder="例如：上海市"/>
          </div>
        </div>

        <div class="action-footer">
          <button class="g-main-btn" @click="handleSave" :disabled="saving">
            <span v-if="saving" class="spinner-small"></span>
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modify-view {
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

.modify-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f1f2f3;
  padding: 40px;
}

.card-header {
  margin-bottom: 40px;
  text-align: center;
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

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border: 4px solid #fcfcfc;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.2s;
}

.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-wrapper:hover .avatar-mask {
  opacity: 1;
}

.avatar-wrapper:hover .avatar-img {
  filter: blur(2px);
}

.avatar-tip {
  font-size: 13px;
  color: #00AEEC;
  font-weight: 500;
  cursor: pointer;
}

.form-group {
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-group.half {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.textarea-item {
  height: auto;
  padding: 12px 16px;
  align-items: flex-start;
}

.textarea-item textarea {
  height: 80px;
  resize: none;
}

.word-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: #9499A0;
}

.action-footer {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f7f7f7;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #00AEEC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 6px;
}

.date-wrapper {
  padding-right: 8px;
}

.date-icon {
  color: #c0c4cc;
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