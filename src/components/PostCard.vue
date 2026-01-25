<script setup lang="ts">
import {ref, computed} from 'vue'
import {useRouter} from 'vue-router'
import {type PostItem} from '../api/post'
import {likePostApi, ActionType} from '../api/post-action'
import {ElMessage} from 'element-plus'
import {usePostCacheStore} from '../stores/postCache'
import { extractPlainTextFromHtml } from '../utils/plainText'
import {useUserStore} from "../stores/user.ts";

const userStore = useUserStore()

const props = defineProps<{
  post: PostItem
}>()

const emit = defineEmits<{
  (e: 'click', postId: number): void
}>()

const router = useRouter()
const cacheStore = usePostCacheStore()

// 预加载逻辑
let timer: ReturnType<typeof setTimeout> | null = null
const handleMouseEnter = () => {
  timer = setTimeout(() => {
    cacheStore.prefetch(props.post.id)
  }, 50)
}
const handleMouseLeave = () => {
  if (timer) clearTimeout(timer)
}

// 状态文字转换
const getStatusText = (status: number) => {
  switch (status) {
    case 0:
      return 'AI 审核中'
    case 2:
      return '待人工审核'
    case 3:
      return '已拒绝/违规'
    default:
      return '异常状态'
  }
}

// --- 样式与媒体处理 ---
const GRADIENTS = [
  'linear-gradient(to bottom right, #fff1eb, #ace0f9)',
  'linear-gradient(to bottom right, #fdfbfb, #ebedee)',
  'linear-gradient(to bottom right, #ffffff, #fff0f5)',
  'linear-gradient(to bottom right, #ffffff, #f0f8ff)',
  'linear-gradient(to bottom right, #ffffff, #f5f5dc)',
  'linear-gradient(to bottom right, #e6e9f0, #eef1f5)',
]
const bgGradient = computed(() => GRADIENTS[props.post.id % GRADIENTS.length])

const imgAspectRatio = ref<number | null>(null)
const media = computed(() => (props.post.medias && props.post.medias.length > 0) ? props.post.medias[0] : undefined)
const isVideo = computed(() => !!media.value?.mime_type?.includes('video'))

const displayUrl = computed(() => {
  if (!media.value) return ''
  return isVideo.value ? (media.value.cover_url || media.value.url) : media.value.url
})

const isDisplayUrlVideo = computed(() => /\.(mp4|webm|ogg|mov)$/i.test(displayUrl.value))

const contentText = computed(() => {
  const source = props.post.plain_content || props.post.content || ''
  return extractPlainTextFromHtml(source)
})

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    imgAspectRatio.value = img.naturalWidth / img.naturalHeight
  }
}

const getMediaStyle = computed(() => {
  if (!media.value) return {background: bgGradient.value}
  let ratio = imgAspectRatio.value || (media.value?.width && media.value?.height ? media.value.width / media.value.height : 0.75)
  return {aspectRatio: `${Math.max(ratio, 0.6)}`}
})

// --- 业务逻辑 ---
const handleLike = async () => {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  const isLiked = !!props.post.is_liked
  const action = isLiked ? ActionType.CANCEL : ActionType.ADD
  props.post.is_liked = !isLiked
  props.post.like_count = (props.post.like_count || 0) + (isLiked ? -1 : 1)
  try {
    await likePostApi(props.post.id, action)
  } catch (error: any) {
    props.post.is_liked = isLiked
    props.post.like_count = (props.post.like_count || 0) + (isLiked ? 1 : -1)
    ElMessage.error(error.message || '操作失败')
  }
}

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
      <img v-else :src="displayUrl" class="cover-content" loading="lazy" @load="handleImageLoad" alt="cover"/>

      <div v-if="isVideo" class="type-badge">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path fill="currentColor" d="M8 5v14l11-7z"/>
        </svg>
      </div>

      <div v-if="post.status !== 1" class="status-tag-v2" :class="'status-' + post.status">
        {{ getStatusText(post.status) }}
      </div>
    </div>

    <div v-else class="text-cover-placeholder" :style="getMediaStyle">
      <div v-if="post.status !== 1" class="status-tag-v2" :class="'status-' + post.status">
        {{ getStatusText(post.status) }}
      </div>
      <div class="quote-col"><span class="quote-symbol">“</span></div>
      <div class="text-col"><p class="note-text">{{ contentText }}</p></div>
    </div>

    <div class="card-body">
      <div class="post-title">{{ post.title || contentText.substring(0, 15) }}</div>
      <div class="card-footer">
        <div class="user-info" @click.stop="handleUserClick">
          <img :src="post.avatar_url" class="avatar-mini" alt="u"/>
          <span class="nickname">{{ post.nickname }}</span>
        </div>
        <div class="like-wrapper" @click.stop="handleLike" :class="{ active: post.is_liked }">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* [新增/修改] 悬浮标签样式 */
.status-tag-v2 {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-0 {
  background: #E6A23C;
}

/* 审核中 - 橙色 */
.status-2 {
  background: #409EFF;
}

/* 待人工 - 蓝色 */
.status-3 {
  background: #F56C6C;
}

/* 已拒绝 - 红色 */

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

.type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 2px 6px;
  color: #fff;
  font-size: 10px;
  z-index: 2;
}

.text-cover-placeholder {
  width: 100%;
  min-height: 160px;
  padding: 24px 20px;
  position: relative;
  display: flex;
  gap: 8px;
}

.text-col {
  flex: 1;
  min-width: 0;
  padding: 0 10px;
}

.quote-symbol {
  font-size: 50px;
  color: rgba(0, 0, 0, 0.08);
  font-family: serif;
}

.note-text {
  font-size: 18px;
  line-height: 1.6;
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.card-body {
  padding: 12px;
}

.post-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  overflow: hidden;
}

.avatar-mini {
  width: 20px;
  height: 20px;
  border-radius: 50%;
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
}

.like-wrapper.active {
  color: #FF4757;
}
</style>
