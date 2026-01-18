<script setup lang="ts">
import {ref, computed} from 'vue'
import {type PostItem} from '../api/post'
import {likePostApi, ActionType} from '../api/post-action'
import {ElMessage} from 'element-plus'

const props = defineProps<{
  post: PostItem
}>()

const emit = defineEmits<{
  (e: 'click', postId: number): void
}>()

// --- 媒体比例处理 ---
const imgAspectRatio = ref<number | null>(null)
const media = computed(() => (props.post.medias && props.post.medias.length > 0) ? props.post.medias[0] : undefined)
const isVideo = computed(() => !!media.value?.mime_type?.includes('video'))

const displayUrl = computed(() => {
  if (!media.value) return ''
  return isVideo.value ? (media.value.cover_url || media.value.url) : media.value.url
})

const isDisplayUrlVideo = computed(() => /\.(mp4|webm|ogg|mov)$/i.test(displayUrl.value))

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    imgAspectRatio.value = img.naturalWidth / img.naturalHeight
  }
}

const getMediaStyle = computed(() => {
  let ratio: number
  if (imgAspectRatio.value) {
    ratio = imgAspectRatio.value
  } else if (media.value?.width && media.value?.height) {
    ratio = media.value.width / media.value.height
  } else {
    ratio = 1
  }
  return {aspectRatio: `${Math.max(ratio, 1 / 1.35)}`}
})

// --- 业务逻辑 ---
const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return ''
  let date = new Date(timeStr)
  if (isNaN(date.getTime())) date = new Date(timeStr.replace(/-/g, '/'))
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return '发布于 刚刚'
  if (diff < 3600) return `发布于 ${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `发布于 ${Math.floor(diff / 3600)}小时前`
  return `发布于 ${Math.floor(diff / 86400)}天前`
}

const handleLike = async () => {
  const post = props.post
  const isLiked = !!post.is_liked
  const action = isLiked ? ActionType.CANCEL : ActionType.ADD
  post.is_liked = !isLiked
  post.like_count = (post.like_count || 0) + (isLiked ? -1 : 1)
  try {
    await likePostApi(post.id, action)
  } catch (error: any) {
    post.is_liked = isLiked
    post.like_count = (post.like_count || 0) + (isLiked ? 1 : -1)
    ElMessage.error(error.message || '操作失败')
  }
}
</script>

<template>
  <div class="post-card" @click="emit('click', post.id)">
    <div class="card-user-header">
      <img :src="post.avatar_url" class="mini-avatar"/>
      <div class="user-meta">
        <span class="nickname">{{ post.nickname }}</span>
        <span class="post-time">{{ formatRelativeTime(post.created_at) }}</span>
      </div>
    </div>

    <div v-if="media" class="media-box" :style="getMediaStyle">
      <video v-if="isDisplayUrlVideo" :src="displayUrl" muted preload="metadata" class="preview-video"/>
      <img v-else :src="displayUrl" loading="lazy" @load="handleImageLoad"/>
      <div v-if="isVideo" class="video-badge">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path fill="currentColor" d="M8 5v14l11-7z"/>
        </svg>
        <span>视频</span>
      </div>
    </div>

    <div v-else class="text-post-placeholder">
      <div class="art-bg"></div>
      <div class="placeholder-inner">
        <span class="decor-quote">“</span>
        <p class="big-text">{{ post.content }}</p>
      </div>
    </div>

    <div class="post-body">
      <h3 class="post-title">{{ post.title }}</h3>
      <div class="card-footer">
        <div class="post-tags">
          <span v-for="tag in post.content?.match(/#\S+/g)?.slice(0, 2)" :key="tag" class="inner-tag">{{ tag }}</span>
        </div>
        <div class="likes" @click.stop="handleLike" :class="{ active: post.is_liked }">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>{{ post.like_count || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #F1F2F3;
  transition: all 0.3s ease;
  overflow: hidden;
  cursor: pointer;
}

.post-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.card-user-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
}

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.nickname {
  font-size: 13px;
  font-weight: 800;
  color: #18191C;
}

.post-time {
  font-size: 11px;
  color: #9499A0;
}

.media-box {
  width: 100%;
  background: #F1F2F5;
  overflow: hidden;
  position: relative;
  transition: aspect-ratio 0.3s ease;
}

.media-box img, .preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-post-placeholder {
  width: 100%;
  min-height: 180px;
  padding: 30px;
  background: #fdfdfd;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.big-text {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  color: #303133;
}

.post-body {
  padding: 12px 16px 18px;
}

.post-title {
  font-size: 15px;
  font-weight: 800;
  color: #18191C;
  margin-bottom: 8px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inner-tag {
  font-size: 12px;
  color: #00AEEC;
  margin-right: 8px;
}

.likes {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #9499A0;
  cursor: pointer;
}

.likes.active {
  color: #FF4757;
}
</style>