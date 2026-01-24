<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPostApi, updatePostApi, getPostDetailApi, type PostMediaPayload } from '../api/post'
import { uploadMediaApi } from '../api/media'

interface LocalMediaItem {
  url: string
  mime: string
  width?: number
  height?: number
  duration?: number
  previewUrl: string
}

const route = useRoute()
const router = useRouter()

const title = ref('')
const content = ref('')
const mediaList = ref<LocalMediaItem[]>([])
const isUploading = ref(false)
const isSaving = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const editingId = computed(() => {
  const raw = route.query.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
})

const resetForm = () => {
  title.value = ''
  content.value = ''
  mediaList.value = []
}

const toPayload = (): PostMediaPayload[] =>
  mediaList.value.map(media => ({
    url: media.url,
    mime_type: media.mime || undefined,
    width: media.width,
    height: media.height,
    duration: media.duration,
    cover_url: media.mime?.includes('video') ? `${media.url}?vframe/jpg/offset/1` : undefined
  }))

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const files = Array.from(input.files)
  isUploading.value = true
  try {
    const uploads = await Promise.all(
      files.map(async file => {
        const previewUrl = URL.createObjectURL(file)
        const res: any = await uploadMediaApi(file)
        if (!res?.data) {
          URL.revokeObjectURL(previewUrl)
          return null
        }
        return {
          url: res.data.url,
          mime: res.data.mime,
          width: res.data.width,
          height: res.data.height,
          duration: res.data.duration,
          previewUrl
        } as LocalMediaItem
      })
    )
    const valid = uploads.filter(Boolean) as LocalMediaItem[]
    mediaList.value = mediaList.value.concat(valid)
  } catch (e) {
    ElMessage.error('上传失败，请稍后重试')
  } finally {
    isUploading.value = false
    if (input) input.value = ''
  }
}

const removeMedia = (index: number) => {
  const target = mediaList.value[index]
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl)
  }
  mediaList.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!content.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }
  isSaving.value = true
  try {
    const payload = toPayload()
    if (editingId.value) {
      await updatePostApi({
        id: editingId.value,
        title: title.value.trim(),
        content: content.value.trim(),
        medias: payload
      })
      ElMessage.success('修改成功')
    } else {
      await createPostApi({
        title: title.value.trim(),
        content: content.value.trim(),
        medias: payload
      })
      ElMessage.success('发布成功')
    }
    router.push('/creator/manage')
  } catch (e) {
    ElMessage.error('提交失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

const loadEditPost = async () => {
  if (!editingId.value) return
  try {
    const res: any = await getPostDetailApi(editingId.value)
    if (!res?.data) return
    title.value = res.data.title || ''
    content.value = res.data.content || ''
    mediaList.value = (res.data.medias || []).map((media: any) => ({
      url: media.url,
      mime: media.mime_type || '',
      width: media.width,
      height: media.height,
      duration: media.duration,
      previewUrl: media.url
    }))
  } catch (e) {
  }
}

onMounted(() => {
  if (editingId.value) {
    loadEditPost()
  } else {
    resetForm()
  }
})
</script>

<template>
  <div class="creator-publish">
    <div class="publish-card">
      <div class="card-header">
        <div>
          <h2>{{ editingId ? '编辑帖子' : '发布帖子' }}</h2>
          <p>在这里分享你的创作灵感</p>
        </div>
        <button class="back-btn" @click="router.push('/creator/manage')">返回管理</button>
      </div>

      <div class="form-section">
        <label class="form-label">标题</label>
        <div class="g-input-item">
          <input v-model="title" type="text" placeholder="输入帖子标题" maxlength="60" />
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">内容</label>
        <div class="g-input-item textarea-item">
          <textarea v-model="content" placeholder="记录你的想法..." rows="8" maxlength="2000"></textarea>
          <span class="word-count">{{ content.length }}/2000</span>
        </div>
      </div>

      <div class="form-section">
        <div class="section-row">
          <label class="form-label">媒体附件</label>
          <button class="upload-btn" @click="triggerUpload" :disabled="isUploading">
            {{ isUploading ? '上传中...' : '添加附件' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            style="display: none"
            @change="handleFileChange"
          />
        </div>
        <div v-if="mediaList.length > 0" class="media-grid">
          <div
            v-for="(media, index) in mediaList"
            :key="media.url + index"
            class="media-item"
            :class="{ audio: media.mime?.startsWith('audio') }"
          >
            <img v-if="media.mime?.startsWith('image')" :src="media.previewUrl" alt="preview" />
            <video v-else-if="media.mime?.startsWith('video')" :src="media.previewUrl" muted></video>
            <div v-else class="audio-placeholder">音频</div>
            <button class="remove-btn" @click="removeMedia(index)">×</button>
          </div>
        </div>
        <div v-else class="media-empty">暂无附件</div>
      </div>

      <div class="action-row">
        <button class="primary-btn" @click="handleSubmit" :disabled="isSaving">
          {{ isSaving ? '提交中...' : (editingId ? '保存修改' : '发布') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.creator-publish {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.publish-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.card-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
}

.card-header p {
  margin: 6px 0 0;
  color: #9499A0;
  font-size: 13px;
}

.back-btn {
  background: #F4F6F8;
  border: none;
  color: #61666D;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: #00AEEC;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #61666D;
  margin-bottom: 10px;
  font-weight: 600;
}

.textarea-item {
  align-items: flex-start;
  padding-top: 12px;
  height: auto;
}

.textarea-item textarea {
  resize: vertical;
  min-height: 140px;
}

.word-count {
  position: absolute;
  bottom: 12px;
  right: 16px;
  font-size: 12px;
  color: #C0C4CC;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-btn {
  background: rgba(0, 174, 236, 0.1);
  color: #00AEEC;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.media-item {
  position: relative;
  background: #F4F6F8;
  border-radius: 12px;
  overflow: hidden;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-item img,
.media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-item.audio {
  background: rgba(0, 174, 236, 0.08);
}

.audio-placeholder {
  color: #00AEEC;
  font-weight: 600;
  font-size: 14px;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.media-empty {
  margin-top: 12px;
  color: #9499A0;
  font-size: 13px;
}

.action-row {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 12px 32px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.primary-btn:disabled {
  background: #A0DFFE;
  cursor: not-allowed;
}
</style>
