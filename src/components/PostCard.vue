<script setup lang="ts">
import {ref, computed} from 'vue'
import {useRouter} from 'vue-router'
import {type PostItem} from '../api/post'
import {likePostApi, ActionType} from '../api/post-action'
import {ElMessage} from 'element-plus'
import {usePostCacheStore} from '../stores/postCache'

const props = defineProps<{
  post: PostItem
}>()

const emit = defineEmits<{
  (e: 'click', postId: number): void
}>()

const router = useRouter()
const cacheStore = usePostCacheStore()

let timer: ReturnType<typeof setTimeout> | null = null

const handleMouseEnter = () => {
  timer = setTimeout(() => {
    cacheStore.prefetch(props.post.id)
  }, 50)
}

const handleMouseLeave = () => {
  if (timer) clearTimeout(timer)
}

// --- 1. 极浅糖果色渐变 (背景色 - 保持极淡，衬托灰色文字) ---
const GRADIENTS = [
  'linear-gradient(to bottom right, #fff1eb, #ace0f9)', // 淡雅蓝红
  'linear-gradient(to bottom right, #fdfbfb, #ebedee)', // 极简灰白
  'linear-gradient(to bottom right, #ffffff, #fff0f5)', // 极淡粉
  'linear-gradient(to bottom right, #ffffff, #f0f8ff)', // 极淡蓝
  'linear-gradient(to bottom right, #ffffff, #f5f5dc)', // 米色
  'linear-gradient(to bottom right, #e6e9f0, #eef1f5)', // 冷灰
]

const bgGradient = computed(() => {
  return GRADIENTS[props.post.id % GRADIENTS.length]
})

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
  // 纯文本卡片：背景色
  if (!media.value) {
    return {
      background: bgGradient.value
    }
  }

  let ratio: number
  if (imgAspectRatio.value) {
    ratio = imgAspectRatio.value
  } else if (media.value?.width && media.value?.height) {
    ratio = media.value.width / media.value.height
  } else {
    ratio = 3 / 4
  }
  return {aspectRatio: `${Math.max(ratio, 0.6)}`}
})

// --- 业务逻辑 ---
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

// 用户跳转逻辑
const handleUserClick = () => {
  router.push({path: '/space', query: {id: props.post.user_id.toString()}})
}
</script>

<template>
  <div
      class="post-card"
      @click="emit('click', post.id)"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
  >
    <div v-if="media" class="card-cover" :style="getMediaStyle">
      <video v-if="isDisplayUrlVideo" :src="displayUrl" muted preload="metadata" class="cover-content"/>
      <img v-else :src="displayUrl" class="cover-content" loading="lazy" @load="handleImageLoad"/>

      <div v-if="isVideo" class="type-badge">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path fill="currentColor" d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </div>

    <div v-else class="text-cover-placeholder" :style="getMediaStyle">
      <div class="quote-col">
        <span class="quote-symbol">“</span>
      </div>
      <div class="text-col">
        <p class="note-text">{{ post.content }}</p>
      </div>
    </div>

    <div class="card-body">
      <div class="post-title">{{ post.title || post.content?.substring(0, 15) }}</div>

      <div class="card-footer">
        <div class="user-info" @click.stop="handleUserClick">
          <img :src="post.avatar_url" class="avatar-mini" alt="u"/>
          <span class="nickname">{{ post.nickname }}</span>
        </div>

        <div class="like-wrapper" @click.stop="handleLike" :class="{ active: post.is_liked }">
          <svg v-if="post.is_liked" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor"
                  d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
          </svg>
          <span class="count">{{ post.like_count || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  break-inside: avoid;
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* --- 媒体样式 --- */
.card-cover {
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
}

.cover-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.post-card:hover .cover-content {
  transform: scale(1.05);
}

.type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  border-radius: 12px;
  padding: 2px 6px;
  color: #fff;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* --- 纯文本海报--- */
.text-cover-placeholder {
  width: 100%;
  min-height: 160px;
  padding: 24px 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
}

.quote-col {
  flex-shrink: 0;
  width: 40px;
}

/* 装饰双引号：浅灰色，作为背景装饰 */
.quote-symbol {
  font-size: 50px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.08);
  font-family: serif;
  display: block;
  transform: translateY(-5px);
}

.text-col {
  flex: 1;
  margin-top: 24px;
}

.note-text {
  font-size: 22px;
  line-height: 1.6;
  font-weight: 500;
  color: #555;
  text-align: left;
  margin: 0;

  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  letter-spacing: 1px;

  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.card-body {
  padding: 12px;
}

.post-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 用户信息：增加点击手型和变色 */
.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  cursor: pointer; /* 增加手型 */
  transition: opacity 0.2s;
}

.user-info:hover {
  opacity: 0.8; /* 悬停微反馈 */
}

.avatar-mini {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f5f5f5;
}

.nickname {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.like-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s;
}

.like-wrapper:hover {
  color: #666;
}

.like-wrapper.active {
  color: #FF4757;
}
</style>