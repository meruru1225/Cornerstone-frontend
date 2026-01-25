<script setup lang="ts">
import { computed } from 'vue'
import { type PostItem } from '../api/post'
import { extractPlainTextFromHtml } from '../utils/plainText'
import { formatRFC3339ToLocal } from '../utils/time'

const props = withDefaults(defineProps<{
  post: PostItem
  selected?: boolean
  actionMode?: 'manage' | 'audit'
  showStatus?: boolean
  showTrend?: boolean
  showEdit?: boolean
  showDelete?: boolean
}>(), {
  actionMode: 'manage',
  showStatus: true,
  showTrend: false,
  showEdit: false,
  showDelete: false
})

const emit = defineEmits<{
  (e: 'select', id: number): void
  (e: 'view', id: number): void
  (e: 'view-trend', id: number): void
  (e: 'edit', id: number): void
  (e: 'delete', id: number): void
  (e: 'approve', id: number): void
  (e: 'reject', id: number): void
}>()

const firstMedia = computed(() => (props.post.medias || [])[0])
const mediaType = computed(() => firstMedia.value?.mime_type || '')
const isVideo = computed(() => mediaType.value.includes('video'))
const isAudio = computed(() => mediaType.value.includes('audio'))
const isImage = computed(() => mediaType.value.includes('image'))

const coverUrl = computed(() => {
  if (!firstMedia.value) return ''
  if (isVideo.value) return firstMedia.value.cover_url || `${firstMedia.value.url}?vframe/jpg/offset/1`
  if (isImage.value) return firstMedia.value.url
  return ''
})

const hasCover = computed(() => !!coverUrl.value)

const statusText = computed(() => {
  switch (props.post.status) {
    case 1:
      return '已发布'
    case 2:
      return '待审核'
    case 0:
      return '审核中'
    case 3:
      return '已拒绝'
    default:
      return '状态异常'
  }
})

const statusClass = computed(() => `status-${props.post.status}`)
const titleText = computed(() => props.post.title || '未命名标题')
const normalizePlainText = (value: string) => value.replace(/\s+/g, ' ').trim()
const toPlainText = (value: string) => normalizePlainText(extractPlainTextFromHtml(value))
const contentText = computed(() => {
  const source = props.post.plain_content || props.post.content || ''
  return toPlainText(source).slice(0, 80)
})
const placeholderText = computed(() => {
  const source = props.post.title || props.post.plain_content || props.post.content || ''
  return toPlainText(source).slice(0, 40)
})

const likeCount = computed(() => props.post.like_count || 0)
const commentCount = computed(() => props.post.comment_count || 0)
const collectCount = computed(() => props.post.collect_count || 0)
const viewCount = computed(() => props.post.view_count || 0)

const handleSelect = () => emit('select', props.post.id)
const handleView = (event: MouseEvent) => {
  event.stopPropagation()
  emit('view', props.post.id)
}
const handleViewTrend = (event: MouseEvent) => {
  event.stopPropagation()
  emit('view-trend', props.post.id)
}
const handleEdit = (event: MouseEvent) => {
  event.stopPropagation()
  emit('edit', props.post.id)
}
const handleDelete = (event: MouseEvent) => {
  event.stopPropagation()
  emit('delete', props.post.id)
}
const handleApprove = (event: MouseEvent) => {
  event.stopPropagation()
  emit('approve', props.post.id)
}
const handleReject = (event: MouseEvent) => {
  event.stopPropagation()
  emit('reject', props.post.id)
}
</script>

<template>
  <div class="post-line" :class="{ selected }" @click="handleSelect">
    <div class="cover" :class="{ placeholder: !hasCover }">
      <img v-if="coverUrl" :src="coverUrl" alt="cover" class="cover-img" />
      <div v-else class="cover-placeholder">
        <div class="placeholder-title">{{ placeholderText || '文字内容' }}</div>
        <div class="placeholder-sub">文字帖子</div>
      </div>
      <div v-if="isVideo" class="media-badge">视频</div>
      <div v-else-if="isAudio" class="media-badge">音频</div>
    </div>

    <div class="info">
      <div class="title-row">
        <div class="title">{{ titleText }}</div>
        <div v-if="showStatus && post.status !== 1" class="status-tag" :class="statusClass">{{ statusText }}</div>
      </div>
      <div class="content">{{ contentText }}</div>
      <div class="meta-row">
        <span>点赞 {{ likeCount }}</span>
        <span class="dot">·</span>
        <span>评论 {{ commentCount }}</span>
        <span class="dot">·</span>
        <span>收藏 {{ collectCount }}</span>
        <span class="dot">·</span>
        <span>浏览 {{ viewCount }}</span>
        <span class="dot">·</span>
        <span>{{ formatRFC3339ToLocal(post.created_at) || '-' }}</span>
      </div>
    </div>

    <div class="actions">
      <button class="ghost-btn" @click="handleView">查看</button>
      <button v-if="showTrend" class="ghost-btn" @click="handleViewTrend">数据趋势</button>
      <button v-if="actionMode === 'manage' && showEdit" class="primary-btn" @click="handleEdit">编辑</button>
      <button v-if="actionMode === 'manage' && showDelete" class="danger-btn" @click="handleDelete">删除</button>
      <template v-if="actionMode === 'audit'">
        <button class="primary-btn" @click="handleApprove">通过</button>
        <button class="danger-btn" @click="handleReject">拒绝</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.post-line {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  transition: border 0.2s, box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}

.post-line:hover {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.post-line.selected {
  border-color: #00AEEC;
  box-shadow: 0 12px 30px rgba(0, 174, 236, 0.12);
}

.cover {
  width: 130px;
  height: 96px;
  border-radius: 12px;
  overflow: hidden;
  background: #f4f6f8;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.75) brightness(0.95);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  color: #3F444B;
  background:
    repeating-linear-gradient(
      to right,
      rgba(63, 68, 75, 0.08) 0px,
      rgba(63, 68, 75, 0.08) 1px,
      transparent 1px,
      transparent 18px
    ),
    repeating-linear-gradient(
      to bottom,
      rgba(63, 68, 75, 0.08) 0px,
      rgba(63, 68, 75, 0.08) 1px,
      transparent 1px,
      transparent 18px
    ),
    #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  text-align: left;
}

.placeholder-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.placeholder-sub {
  font-size: 11px;
  color: #8A9099;
  letter-spacing: 0.5px;
}

.media-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #18191C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 0 1 auto;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #F4F6F8;
  color: #61666D;
  flex-shrink: 0;
}

.status-1 {
  background: rgba(0, 174, 236, 0.12);
  color: #00AEEC;
}

.status-2 {
  background: rgba(250, 173, 20, 0.12);
  color: #FAAD14;
}

.status-0 {
  background: rgba(230, 162, 60, 0.12);
  color: #E6A23C;
}

.status-3 {
  background: rgba(244, 67, 54, 0.12);
  color: #F44336;
}

.content {
  font-size: 13px;
  color: #61666D;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #9499A0;
}

.dot {
  color: #D0D3D8;
}

.actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.ghost-btn {
  background: #F4F6F8;
  border: none;
  color: #61666D;
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}

.danger-btn {
  background: #F56C6C;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
}
</style>
