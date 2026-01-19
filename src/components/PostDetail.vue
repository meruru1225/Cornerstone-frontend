<script setup lang="ts">
import {ref, computed, watch, nextTick, onUnmounted} from 'vue'
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {type PostItem, type MediaItem, type PostMediaPayload} from '../api/post'
import {
  likePostApi,
  collectPostApi,
  ActionType,
  getPostActionStateApi,
  createCommentApi,
  getSubCommentsApi,
  likeCommentApi,
  deleteCommentApi,
  reportPostApi,
  type CommentItem,
  type CreateCommentParams
} from '../api/post-action'
import {checkIsFollowApi, followUserApi, unfollowUserApi} from '../api/relation'
import {uploadMediaApi, type MediaUploadData} from '../api/media'
import {useUserStore} from '../stores/user'
import {usePostCacheStore} from '../stores/postCache'

interface LocalMediaData extends MediaUploadData {
  previewUrl: string
}

const props = defineProps<{
  modelValue: boolean
  postId: number | null
}>()

const emit = defineEmits(['update:modelValue'])
const userStore = useUserStore()
const cacheStore = usePostCacheStore()
const router = useRouter()

// --- 状态数据 ---
const post = ref<PostItem | null>(null)
const stats = ref({
  like_count: 0,
  collect_count: 0,
  comment_count: 0,
  view_count: 0,
  is_liked: false,
  is_collected: false
})
const isFollowing = ref(false)
const comments = ref<CommentItem[]>([])
const activeMediaIndex = ref(0)

// --- 交互状态 ---
const isInputFocused = ref(false)
const commentText = ref('')
const replyTarget = ref<CommentItem | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// --- 评论媒体上传状态 ---
const fileInputRef = ref<HTMLInputElement | null>(null)
const commentMedia = ref<LocalMediaData[]>([])
const isUploading = ref(false)

// --- 媒体预览状态 ---
const previewOverlay = ref({
  visible: false,
  type: 'image' as 'image' | 'video',
  url: ''
})

// --- 音频播放状态 ---
const currentAudioUrl = ref('')
const isAudioPlaying = ref(false)
const audioPlayer = new Audio()

audioPlayer.addEventListener('ended', () => {
  isAudioPlaying.value = false
  currentAudioUrl.value = ''
})

const close = () => {
  stopAudio()
  if (props.postId) {
    cacheStore.clearCache(props.postId)
  }
  emit('update:modelValue', false)
}

onUnmounted(() => {
  stopAudio()
  clearMedia()
})

// --- 辅助函数 ---
const normalizeMedia = (mediaInfo: any): any[] => {
  if (!mediaInfo) return []
  return Array.isArray(mediaInfo) ? mediaInfo : [mediaInfo]
}

const isVideo = (mime?: string) => !!mime && mime.includes('video')
const isAudio = (mime?: string) => !!mime && mime.includes('audio')

// --- 计算属性 ---
const allMedias = computed<MediaItem[]>(() => post.value?.medias || [])
const visualMedias = computed(() => allMedias.value.filter(m => !isAudio(m.mime_type)))
const postAudios = computed(() => allMedias.value.filter(m => isAudio(m.mime_type)))
const hasVisualMedia = computed(() => visualMedias.value.length > 0)
const currentMedia = computed(() => visualMedias.value[activeMediaIndex.value])
const isMainVideo = (media: MediaItem | undefined): boolean => !!media?.mime_type?.includes('video')

const extractedTags = computed(() => post.value?.content?.match(/#\S+/g) || [])
const cleanContent = computed(() => {
  if (!post.value?.content) return ''
  return post.value.content.replace(/#\S+/g, '').trim()
})

const inputPlaceholder = computed(() => {
  if (replyTarget.value) {
    return `回复 @${replyTarget.value.nickname}`
  }
  return '说点什么...'
})

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const showMessage = (type: 'success' | 'warning' | 'error', msg: string) => {
  ElMessage({
    type,
    message: msg,
    appendTo: document.body,
    offset: 40,
    grouping: true
  })
}

// --- 其他辅助函数 ---
const checkLogin = () => {
  if (!userStore.isLoggedIn || !userStore.userInfo) {
    showMessage('warning', '请先登录')
    return false
  }
  return true
}

const getAudios = (mediaInfo: any) => normalizeMedia(mediaInfo).filter(m => isAudio(m.mime_type))
const getVisuals = (mediaInfo: any) => normalizeMedia(mediaInfo).filter(m => !isAudio(m.mime_type))

const formatAudioDuration = (duration?: number) => {
  if (!duration) return `0''`
  const d = Math.floor(duration)
  if (d < 60) return `${d}''`
  const m = Math.floor(d / 60)
  const s = d % 60
  const sStr = s < 10 ? `0${s}` : `${s}`
  return `${m}'${sStr}"`
}

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}

// --- 跳转逻辑 ---
const handleTagClick = (tag: string) => {
  const tagName = tag.replace('#', '')
  close()
  router.push({path: '/user-tags', query: {tag: tagName}})
}

const handleUserClick = (userId: number) => {
  close()
  router.push({path: '/space', query: {id: userId.toString()}})
}

// --- 媒体交互 ---
const prevMedia = () => {
  if (activeMediaIndex.value > 0) {
    activeMediaIndex.value--
  }
}

const nextMedia = () => {
  if (activeMediaIndex.value < visualMedias.value.length - 1) {
    activeMediaIndex.value++
  }
}

const handleMediaWheel = (e: WheelEvent) => {
  if (visualMedias.value.length <= 1) return
  if (e.deltaY > 0) {
    nextMedia()
  } else {
    prevMedia()
  }
}

const openPreview = (url: string, type: 'image' | 'video') => {
  stopAudio()
  previewOverlay.value = {
    visible: true,
    type,
    url
  }
}

const closePreview = () => {
  previewOverlay.value.visible = false
  previewOverlay.value.url = ''
}

const toggleAudio = (url: string) => {
  if (currentAudioUrl.value === url) {
    if (isAudioPlaying.value) {
      audioPlayer.pause()
      isAudioPlaying.value = false
    } else {
      audioPlayer.play()
      isAudioPlaying.value = true
    }
  } else {
    audioPlayer.src = url
    audioPlayer.load()
    audioPlayer.play()
    currentAudioUrl.value = url
    isAudioPlaying.value = true
  }
}

const stopAudio = () => {
  audioPlayer.pause()
  isAudioPlaying.value = false
  currentAudioUrl.value = ''
}

// --- 数据获取 ---
const fetchComments = async (postId: number) => {
  try {
    const res: any = await cacheStore.getComments(postId)
    comments.value = res.data || []
  } catch (e) {
    console.error('评论加载失败', e)
  }
}

const handleExpandSubComments = async (comment: CommentItem) => {
  try {
    const res: any = await getSubCommentsApi(comment.id, {page: 1, page_size: 50})
    if (res.data) {
      comment.sub_comments = res.data
    }
  } catch (e) {
    showMessage('error', '加载回复失败')
  }
}

const initData = async (id: number) => {
  try {
    const res: any = await cacheStore.getDetail(id)

    if (res.data) {
      post.value = res.data
      stats.value = {
        like_count: res.data.like_count || 0,
        collect_count: res.data.collect_count || 0,
        comment_count: res.data.comment_count || 0,
        view_count: res.data.view_count || 0,
        is_liked: !!res.data.is_liked,
        is_collected: !!res.data.is_collected
      }

      try {
        const stateRes: any = await getPostActionStateApi(id.toString())
        if (stateRes.data) stats.value = {...stats.value, ...stateRes.data}
      } catch (e) {
      }

      await fetchComments(id)

      if (userStore.isLoggedIn && userStore.userInfo && res.data.user_id !== userStore.userInfo.user_id) {
        try {
          const followRes: any = await checkIsFollowApi(res.data.user_id)
          isFollowing.value = !!followRes.data
        } catch (e) {
        }
      }
    }
  } catch (error) {
    showMessage('error', '无法加载内容')
  }
}

watch(() => props.modelValue, (val) => {
  if (val && props.postId) {
    initData(props.postId)
    activeMediaIndex.value = 0
    handleCancel()
  } else {
    setTimeout(() => {
      post.value = null
      comments.value = []
      clearMedia()
      replyTarget.value = null
      commentText.value = ''
      stopAudio()
    }, 300)
  }
})

// --- 核心交互操作 ---

const triggerUpload = () => {
  if (!checkLogin()) return
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const files = Array.from(input.files)
    isUploading.value = true

    const uploadPromises = files.map(async (file) => {
      const localUrl = URL.createObjectURL(file)
      try {
        const res = await uploadMediaApi(file)
        if (res.data) {
          return {
            ...res.data,
            previewUrl: localUrl
          } as LocalMediaData
        }
        URL.revokeObjectURL(localUrl)
        return null
      } catch (e) {
        URL.revokeObjectURL(localUrl)
        return null
      }
    })

    try {
      const results = await Promise.all(uploadPromises)
      const successItems = results.filter((item): item is LocalMediaData => item !== null)
      if (successItems.length > 0) {
        commentMedia.value.push(...successItems)
        isInputFocused.value = true
      }
    } catch (error) {
      showMessage('error', '上传出错')
    } finally {
      isUploading.value = false
      input.value = ''
    }
  }
}

const clearMedia = () => {
  commentMedia.value.forEach(m => {
    if (m.previewUrl) URL.revokeObjectURL(m.previewUrl)
  })
  commentMedia.value = []
}

const removeMedia = (index: number) => {
  const media = commentMedia.value[index]
  if (media && media.previewUrl) {
    URL.revokeObjectURL(media.previewUrl)
  }
  commentMedia.value.splice(index, 1)
}

const handleDeleteComment = (commentId: number, parentId: number = 0) => {
  if (!checkLogin()) return

  ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
    appendTo: document.body
  }).then(async () => {
    try {
      await deleteCommentApi(commentId)
      showMessage('success', '删除成功')

      if (parentId === 0) {
        comments.value = comments.value.filter(c => c.id !== commentId)
      } else {
        comments.value.forEach(root => {
          if (root.sub_comments) {
            root.sub_comments = root.sub_comments.filter(c => c.id !== commentId)
          }
        })
      }
      stats.value.comment_count = Math.max(0, stats.value.comment_count - 1)
    } catch (error) {
      showMessage('error', '删除失败')
    }
  })
}

// 举报帖子
const handleReportPost = () => {
  if (!checkLogin() || !post.value) return
  ElMessageBox.prompt('请输入举报理由', '举报帖子', {
    confirmButtonText: '提交',
    cancelButtonText: '取消',
    inputPattern: /\S/,
    inputErrorMessage: '理由不能为空',
    appendTo: document.body
  }).then(async ({value}) => {
    try {
      await reportPostApi({post_id: post.value!.id, reason: value})
      showMessage('success', '举报已提交，我们会尽快处理')
    } catch (e) {
      showMessage('error', '操作失败')
    }
  }).catch(() => {
  })
}

// 举报评论
const handleReportComment = (commentId: number) => {
  if (!checkLogin()) return
  ElMessageBox.confirm('确定要举报这条评论吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    appendTo: document.body
  }).then(() => {
    console.log('reporting comment', commentId)
    showMessage('success', '举报成功')
  }).catch(() => {
  })
}

const toggleCommentLike = async (comment: any) => {
  if (!checkLogin()) return

  const originalState = comment.is_liked
  const action = originalState ? ActionType.CANCEL : ActionType.ADD

  comment.is_liked = !originalState
  comment.likes_count += originalState ? -1 : 1

  try {
    await likeCommentApi(comment.id, action)
  } catch (error) {
    comment.is_liked = originalState
    comment.likes_count += originalState ? 1 : -1
    showMessage('warning', '操作失败')
  }
}

const handleReplyTrigger = (targetComment: CommentItem) => {
  if (!checkLogin()) return
  replyTarget.value = targetComment
  isInputFocused.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleFocusInput = () => {
  replyTarget.value = null
  isInputFocused.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleCancel = () => {
  commentText.value = ''
  clearMedia()
  replyTarget.value = null
  isInputFocused.value = false
}

const handleSendComment = async () => {
  if (!checkLogin()) return
  if ((!commentText.value.trim() && commentMedia.value.length === 0) || !post.value) return

  const mediaPayload: PostMediaPayload[] = commentMedia.value.map(m => ({
    url: m.url,
    mime_type: m.mime,
    width: m.width,
    height: m.height,
    duration: m.duration,
    cover_url: m.mime.includes('video') ? m.url + '?vframe/jpg/offset/1' : undefined
  }))

  const params: CreateCommentParams = {
    post_id: post.value.id,
    content: commentText.value,
    parent_id: replyTarget.value?.id || 0,
    media_info: mediaPayload
  }

  try {
    await createCommentApi(params)
    showMessage('success', '发送成功')
    handleCancel()
    await fetchComments(post.value.id)
    stats.value.comment_count++
  } catch (error) {
    showMessage('error', '发送失败，请稍后重试')
  }
}

const handleFollow = async () => {
  if (!checkLogin()) return
  if (!post.value) return

  const targetId = post.value.user_id
  const originalState = isFollowing.value
  isFollowing.value = !originalState

  try {
    originalState ? await unfollowUserApi(targetId) : await followUserApi(targetId)
  } catch (error) {
    isFollowing.value = originalState
    showMessage('error', '操作失败')
  }
}

const handleAction = async (type: 'like' | 'collect') => {
  if (!checkLogin()) return
  if (!post.value) return

  const isState = type === 'like' ? stats.value.is_liked : stats.value.is_collected
  const action = isState ? ActionType.CANCEL : ActionType.ADD

  if (type === 'like') {
    stats.value.is_liked = !isState
    stats.value.like_count += isState ? -1 : 1
  } else {
    stats.value.is_collected = !isState
    stats.value.collect_count += isState ? -1 : 1
  }

  try {
    type === 'like'
        ? await likePostApi(post.value.id, action)
        : await collectPostApi(post.value.id, action)
  } catch (error) {
    if (type === 'like') {
      stats.value.is_liked = isState
      stats.value.like_count += isState ? 1 : -1
    } else {
      stats.value.is_collected = isState
      stats.value.collect_count += isState ? 1 : -1
    }
  }
}

const handleShare = async () => {
  if (!post.value) return
  const shareUrl = `${window.location.origin}/detail?id=${post.value.id}`
  try {
    await navigator.clipboard.writeText(shareUrl)
    showMessage('success', '已复制链接到剪贴板')
  } catch (err) {
    showMessage('error', '复制失败，请手动复制')
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}-${date.getDate()}`
}

// 格式化为中文年月日
const formatFullDate = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<template>
  <Teleport to="body">

    <Transition name="fade">
      <div v-if="previewOverlay.visible" class="media-viewer-overlay" @click="closePreview">
        <div class="media-viewer-content" @click.stop>
          <img v-if="previewOverlay.type === 'image'" :src="previewOverlay.url" class="viewer-img"/>
          <video v-if="previewOverlay.type === 'video'" :src="previewOverlay.url" controls autoplay
                 class="viewer-video"/>
        </div>
        <button class="viewer-close" @click="closePreview">✕</button>
      </div>
    </Transition>

    <Transition name="detail-zoom">
      <div v-if="modelValue" class="detail-overlay" @click.self="close">

        <div class="detail-card" v-if="post">

          <div class="visual-container" @wheel.prevent="handleMediaWheel">
            <template v-if="hasVisualMedia">
              <div class="blur-background" :style="{ backgroundImage: `url(${currentMedia?.url})` }"></div>

              <div class="media-stage">
                <Transition name="media-fade" mode="out-in">
                  <div :key="currentMedia?.url" class="media-content-wrapper">
                    <video
                        v-if="isMainVideo(currentMedia)"
                        :src="currentMedia?.url"
                        controls
                        autoplay
                        class="media-content"
                    />
                    <img
                        v-else
                        :src="currentMedia?.url"
                        class="media-content"
                        alt="content"
                    />
                  </div>
                </Transition>
              </div>

              <div class="media-nav-overlay">
                <button
                    v-if="activeMediaIndex > 0"
                    class="nav-btn prev"
                    @click.stop="prevMedia"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <button
                    v-if="activeMediaIndex < visualMedias.length - 1"
                    class="nav-btn next"
                    @click.stop="nextMedia"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              </div>

              <div v-if="visualMedias.length > 1" class="media-dots">
                <span v-for="(_, i) in visualMedias" :key="i" :class="{ active: i === activeMediaIndex }"
                      @click="activeMediaIndex = i"></span>
              </div>
            </template>

            <div v-else class="text-poster">
              <div class="poster-inner">
                <span class="poster-tag">CORNERSTONE</span>
                <h1 class="poster-title">{{ post.title }}</h1>
                <div class="poster-line"></div>
                <p class="poster-desc">{{ cleanContent?.substring(0, 150) }}...</p>
              </div>
            </div>
          </div>

          <div class="info-panel">
            <header class="panel-header">
              <img
                  :src="post.avatar_url || defaultAvatar"
                  class="author-avatar clickable"
                  alt="avatar"
                  @click="handleUserClick(post.user_id)"
              />
              <div class="author-info">
                <span class="nickname clickable" @click="handleUserClick(post.user_id)">
                  {{ post.nickname }}
                </span>
              </div>

              <button
                  v-if="post.user_id !== userStore.userInfo?.user_id"
                  class="follow-btn"
                  :class="{ 'is-following': isFollowing }"
                  @click="handleFollow"
              >
                {{ isFollowing ? '已关注' : '关注' }}
              </button>

              <button class="close-btn" @click="close">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor"
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </header>

            <div class="panel-scroll">
              <article class="article-content">
                <h2 class="title">{{ post.title }}</h2>
                <pre class="content">{{ cleanContent }}</pre>

                <div v-if="postAudios.length > 0" class="post-audio-section">
                  <div
                      v-for="(audio, idx) in postAudios"
                      :key="idx"
                      class="audio-bubble"
                      :class="{ playing: currentAudioUrl === audio.url && isAudioPlaying }"
                      @click.stop="toggleAudio(audio.url)"
                  >
                    <span class="audio-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor"
                                                                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                    </span>
                    <span class="audio-time">{{ formatAudioDuration(audio.duration) }}</span>
                  </div>
                </div>

                <div class="tags" v-if="extractedTags.length > 0">
                  <span
                      v-for="tag in extractedTags"
                      :key="tag"
                      class="tag-item"
                      @click="handleTagClick(tag)"
                  >
                    {{ tag }}
                  </span>
                </div>
              </article>

              <div class="divider"></div>

              <div class="post-meta-row">
                <div class="meta-left">
                  <span>发布于 {{ formatFullDate(post.created_at) }}</span>
                  <span class="meta-dot">·</span>
                  <span>已浏览 {{ stats.view_count }} 次</span>
                </div>

                <el-dropdown trigger="click" @command="handleReportPost">
                  <div class="more-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor"
                            d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="report">举报</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="comments-list">
                <div v-if="comments.length > 0">
                  <div class="comments-count">共 {{ comments.length }} 条评论</div>

                  <div v-for="comment in comments" :key="comment.id" class="comment-wrapper">
                    <div class="comment-item">
                      <img
                          :src="comment.avatar_url || defaultAvatar"
                          class="c-avatar clickable"
                          alt="user"
                          @click="handleUserClick(comment.user_id)"
                      />
                      <div class="c-content">
                        <div class="c-user clickable" @click="handleUserClick(comment.user_id)">
                          {{ comment.nickname }}
                        </div>
                        <div class="c-text">{{ comment.content }}</div>

                        <div v-if="getAudios(comment.media_info).length > 0" class="c-audio-list">
                          <div
                              v-for="(audio, idx) in getAudios(comment.media_info)"
                              :key="idx"
                              class="audio-bubble"
                              :class="{ playing: currentAudioUrl === audio.url && isAudioPlaying }"
                              @click.stop="toggleAudio(audio.url)"
                          >
                            <span class="audio-icon">
                              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor"
                                                                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                            </span>
                            <span class="audio-time">{{ formatAudioDuration(audio.duration) }}</span>
                          </div>
                        </div>

                        <div v-if="getVisuals(comment.media_info).length > 0" class="c-media-grid">
                          <div
                              v-for="(m, i) in getVisuals(comment.media_info)"
                              :key="i"
                              class="c-media-item"
                          >
                            <div
                                v-if="isVideo(m.mime_type)"
                                class="video-thumb"
                                @click.stop="openPreview(m.url, 'video')"
                            >
                              <img
                                  :src="m.cover_url || m.url + '?vframe/jpg/offset/1'"
                                  class="c-img"
                                  loading="lazy"
                                  @error="handleImgError"
                              />
                              <div class="play-icon">▶</div>
                            </div>

                            <img
                                v-else
                                :src="m.url"
                                class="c-img"
                                loading="lazy"
                                @click.stop="openPreview(m.url, 'image')"
                                @error="handleImgError"
                            />
                          </div>
                        </div>

                        <div class="c-meta">
                          <span class="c-date">{{ formatTime(comment.created_at) }}</span>
                          <span class="c-reply" @click.stop="handleReplyTrigger(comment)">回复</span>

                          <span class="c-report" @click.stop="handleReportComment(comment.id)">举报</span>

                          <span
                              v-if="userStore.userInfo?.user_id === comment.user_id"
                              class="c-delete"
                              @click.stop="handleDeleteComment(comment.id, 0)"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor"
                                                                                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </span>
                        </div>
                      </div>

                      <div class="c-like" :class="{ active: (comment as any).is_liked }"
                           @click.stop="toggleCommentLike(comment)">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="currentColor"
                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span>{{ comment.likes_count || 0 }}</span>
                      </div>
                    </div>

                    <div class="sub-comments" v-if="comment.sub_comments && comment.sub_comments.length > 0">
                      <div v-for="sub in comment.sub_comments" :key="sub.id" class="comment-item sub-item">
                        <img
                            :src="sub.avatar_url || defaultAvatar"
                            class="c-avatar small clickable"
                            alt="sub-user"
                            @click="handleUserClick(sub.user_id)"
                        />
                        <div class="c-content">
                          <div class="c-user">
                            <span class="clickable" @click="handleUserClick(sub.user_id)">
                              {{ sub.nickname }}
                            </span>
                            <span v-if="sub.reply_to_nickname" class="reply-wrapper">
                              回复
                              <span class="at-name clickable" @click.stop="handleUserClick(sub.reply_to_user_id)">
                                @{{ sub.reply_to_nickname }}
                              </span>
                            </span>
                          </div>
                          <div class="c-text">{{ sub.content }}</div>

                          <div v-if="getAudios(sub.media_info).length > 0" class="c-audio-list">
                            <div
                                v-for="(audio, idx) in getAudios(sub.media_info)"
                                :key="idx"
                                class="audio-bubble"
                                :class="{ playing: currentAudioUrl === audio.url && isAudioPlaying }"
                                @click.stop="toggleAudio(audio.url)"
                            >
                              <span class="audio-icon">
                                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor"
                                                                                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                              </span>
                              <span class="audio-time">{{ formatAudioDuration(audio.duration) }}</span>
                            </div>
                          </div>

                          <div v-if="getVisuals(sub.media_info).length > 0" class="c-media-grid">
                            <div
                                v-for="(m, i) in getVisuals(sub.media_info)"
                                :key="i"
                                class="c-media-item"
                            >
                              <div
                                  v-if="isVideo(m.mime_type)"
                                  class="video-thumb"
                                  @click.stop="openPreview(m.url, 'video')"
                              >
                                <img
                                    :src="m.cover_url || m.url + '?vframe/jpg/offset/1'"
                                    class="c-img"
                                    loading="lazy"
                                    @error="handleImgError"
                                />
                                <div class="play-icon">▶</div>
                              </div>

                              <img
                                  v-else
                                  :src="m.url"
                                  class="c-img"
                                  loading="lazy"
                                  @click.stop="openPreview(m.url, 'image')"
                                  @error="handleImgError"
                              />
                            </div>
                          </div>

                          <div class="c-meta">
                            <span class="c-date">{{ formatTime(sub.created_at) }}</span>
                            <span class="c-reply" @click.stop="handleReplyTrigger(sub)">回复</span>

                            <span class="c-report" @click.stop="handleReportComment(sub.id)">举报</span>

                            <span
                                v-if="userStore.userInfo?.user_id === sub.user_id"
                                class="c-delete"
                                @click.stop="handleDeleteComment(sub.id, comment.id)"
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor"
                                                                                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </span>
                          </div>
                        </div>

                        <div class="c-like" :class="{ active: (sub as any).is_liked }"
                             @click.stop="toggleCommentLike(sub)">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor"
                                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          <span>{{ sub.likes_count || 0 }}</span>
                        </div>
                      </div>
                    </div>

                    <div
                        v-if="comment.sub_comment_count > (comment.sub_comments?.length || 0)"
                        class="expand-more"
                        @click="handleExpandSubComments(comment)"
                    >
                      —— 展开 {{ comment.sub_comment_count - (comment.sub_comments?.length || 0) }} 条回复
                    </div>
                  </div>
                </div>

                <div v-else class="empty-tip">
                  <svg class="empty-svg" viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor"
                          d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                  <p>暂无评论，快来抢沙发吧</p>
                </div>
              </div>
            </div>

            <footer class="interaction-bar"
                    :class="{ 'is-expanded': isInputFocused || commentText || commentMedia.length }">
              <div class="input-section">
                <img :src="userStore.userInfo?.avatar_url || defaultAvatar" class="my-avatar" alt="me"/>
                <div class="input-box">
                  <input
                      ref="inputRef"
                      type="text"
                      v-model="commentText"
                      :placeholder="inputPlaceholder"
                      @focus="isInputFocused = true"
                      @keyup.enter="handleSendComment"
                  />
                </div>
              </div>

              <div v-if="commentMedia.length > 0" class="upload-preview-area">
                <div v-for="(media, idx) in commentMedia" :key="idx" class="preview-item"
                     :class="{ 'is-audio': media.mime.includes('audio') }">

                  <img v-if="media.mime.includes('image')" :src="media.previewUrl || media.url"/>

                  <div v-else-if="media.mime.includes('audio')" class="audio-thumb">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor"
                            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>

                  <video v-else :src="media.previewUrl || media.url"></video>

                  <div class="remove-btn" @click="removeMedia(idx)">×</div>
                </div>
              </div>

              <div class="action-section">
                <transition name="fade">
                  <div v-if="isInputFocused || commentText || commentMedia.length" class="edit-actions">
                    <div class="tool-btn" @click="triggerUpload" title="上传附件">
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor"
                              d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                      <input
                          type="file"
                          ref="fileInputRef"
                          style="display: none"
                          accept="image/*,video/*,audio/*"
                          multiple
                          @change="handleFileChange"
                      />
                    </div>

                    <button class="cancel-btn" @mousedown.prevent="handleCancel">取消</button>
                    <button
                        class="send-btn"
                        @mousedown.prevent="handleSendComment"
                        :disabled="!commentText.trim() && commentMedia.length === 0"
                    >
                      {{ isUploading ? '上传中...' : '发送' }}
                    </button>
                  </div>
                </transition>

                <div v-show="!isInputFocused && !commentText && commentMedia.length === 0" class="icon-actions">
                  <div class="icon-item" @click="handleAction('like')" :class="{ active: stats.is_liked }">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span class="count">{{ stats.like_count || 0 }}</span>
                  </div>
                  <div class="icon-item" @click="handleAction('collect')" :class="{ active: stats.is_collected }">
                    <svg viewBox="0 0 24 24" width="26" height="26">
                      <path fill="currentColor"
                            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <span class="count">{{ stats.collect_count || 0 }}</span>
                  </div>
                  <div class="icon-item" @click="handleFocusInput">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span class="count">{{ stats.comment_count || 0 }}</span>
                  </div>
                  <div class="icon-item share-icon" @click="handleShare">
                    <svg viewBox="0 0 24 24" width="24" height="24" style="transform: rotateY(180deg);">
                      <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 全屏媒体查看器 */
.media-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.media-viewer-content {
  max-width: 90vw;
  max-height: 90vh;
}

.viewer-img, .viewer-video {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}

.viewer-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 主弹窗背景 */
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.detail-card {
  display: flex;
  width: 90vw;
  max-width: 1400px;
  height: 85vh;
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.5);
}

.visual-container {
  flex: 1;
  min-width: 0;
  background: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.blur-background {
  position: absolute;
  width: 120%;
  height: 120%;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.5);
  opacity: 0.8;
}

.media-stage {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.media-content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 媒体导航箭头样式 */
.media-nav-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.nav-btn {
  pointer-events: auto;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: all 0.3s;
  opacity: 0;
}

.nav-btn.prev {
  left: 20px;
}

.nav-btn.next {
  right: 20px;
}

.visual-container:hover .nav-btn {
  opacity: 1;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: translateY(-50%) scale(1.1);
}

.text-poster {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #00AEEC 0%, #FB7299 100%);
  display: flex;
  align-items: center;
  padding: 80px;
}

.poster-inner {
  color: #fff;
  max-width: 600px;
}

.poster-tag {
  font-weight: 900;
  letter-spacing: 4px;
  opacity: 0.6;
  display: block;
  margin-bottom: 20px;
  font-size: 12px;
}

.poster-title {
  font-size: 48px;
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 30px;
}

.poster-line {
  width: 50px;
  height: 6px;
  background: #fff;
  border-radius: 3px;
  margin-bottom: 30px;
}

.poster-desc {
  font-size: 20px;
  line-height: 1.6;
  opacity: 0.95;
}

.info-panel {
  width: 450px;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #f0f0f0;
  position: relative;
  z-index: 10;
}

.panel-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f7f7f7;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #eee;
  object-fit: cover;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 居中对齐 */
.nickname {
  font-weight: 700;
  font-size: 14px;
  color: #333;
}

button.follow-btn {
  padding: 6px 18px;
  border-radius: 20px;
  border: 1px solid #00AEEC;
  background-color: #00AEEC;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

button.follow-btn:hover {
  background-color: #fff;
  color: #00AEEC;
}

button.follow-btn.is-following {
  background-color: #F1F2F3;
  color: #9499A0;
  border-color: #F1F2F3;
}

button.follow-btn.is-following:hover {
  background-color: #E3E5E7;
  border-color: #E3E5E7;
  color: #9499A0;
}

.close-btn {
  margin-left: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

/* 新增：底部元数据行 */
.post-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24px;
  color: #9499A0;
  font-size: 12px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.more-btn {
  cursor: pointer;
  color: #999;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.more-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
  line-height: 1.4;
}

.content {
  font-size: 16px;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.tags {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  color: #00AEEC;
  font-size: 13px;
  cursor: pointer;
  background: rgba(0, 174, 236, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.2s;
}

.tag-item:hover {
  background: rgba(0, 174, 236, 0.2);
}

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 24px 0;
}

.date-view {
  font-size: 12px;
  color: #999;
  margin-bottom: 30px;
}

.comments-count {
  font-size: 14px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 20px;
}

.comment-wrapper {
  margin-bottom: 24px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.c-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.c-content {
  flex: 1;
}

.c-user {
  font-size: 13px;
  color: #61666D;
  margin-bottom: 4px;
  font-weight: 600;
}

.c-text {
  font-size: 14px;
  color: #18191C;
  line-height: 1.6;
  margin-bottom: 6px;
}

.c-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #9499A0;
}

.c-reply {
  cursor: pointer;
  font-weight: 600;
}

.c-reply:hover {
  color: #00AEEC;
}

.c-report {
  cursor: pointer;
  font-weight: 600;
}

.c-report:hover {
  color: #FF4757;
}

.c-like {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #9499A0;
  cursor: pointer;
  font-size: 12px;
}

.c-like:hover {
  color: #FF4757;
}

.c-like.active {
  color: #FF4757;
}

.c-delete {
  cursor: pointer;
  margin-left: auto;
  color: #ccc;
  transition: color 0.2s;
}

.c-delete:hover {
  color: #FF4757;
}

.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.clickable:hover {
  color: #00AEEC;
}

.post-audio-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.c-audio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 4px;
}

.c-media-grid {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.c-media-item {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  background: #f4f6f8;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  position: relative;
}

.c-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
}

.c-img:hover {
  transform: scale(1.05);
}

.video-thumb {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 24px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.audio-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #E3F2FD;
  color: #00AEEC;
  padding: 6px 12px;
  border-radius: 16px;
  width: fit-content;
  min-width: 80px;
  max-width: 200px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(0, 174, 236, 0.1);
}

.audio-bubble:hover {
  background: #BBDEFB;
}

.audio-bubble.playing {
  background: #00AEEC;
  color: #fff;
}

.audio-time {
  font-size: 12px;
  font-weight: 600;
}

.sub-comments {
  margin-left: 44px;
  margin-top: 16px;
}

.sub-item {
  margin-bottom: 16px;
}

.c-avatar.small {
  width: 24px;
  height: 24px;
}

.reply-wrapper {
  color: #9499A0;
  font-weight: 400;
  margin-left: 6px;
}

.at-name {
  color: #00AEEC;
  font-weight: 500;
  cursor: pointer;
}

.expand-more {
  margin-left: 44px;
  font-size: 13px;
  color: #9499A0;
  cursor: pointer;
  margin-top: 8px;
}

.expand-more:hover {
  color: #00AEEC;
}

.empty-tip {
  text-align: center;
  color: #ccc;
  font-size: 14px;
  margin-top: 60px;
}

.empty-svg {
  margin-bottom: 10px;
  opacity: 0.1;
  color: #000;
}

.interaction-bar {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
}

.input-section {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.my-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.input-box {
  flex: 1;
  background: #F4F6F8;
  border-radius: 20px;
  padding: 0 16px;
  min-height: 40px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.interaction-bar.is-expanded .input-box {
  background: #fff;
  border-color: #E0E0E0;
  align-items: flex-start;
  padding-top: 10px;
  height: 80px;
}

.input-box input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #333;
}

.upload-preview-area {
  padding: 0 48px;
  display: flex;
  gap: 12px;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #eee;
  background: #f4f6f8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-item.is-audio {
  width: auto;
  height: auto;
  background: transparent;
  border: none;
}

.preview-item img, .preview-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-thumb {
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.action-section {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.interaction-bar:not(.is-expanded) {
  flex-direction: row;
  align-items: center;
}

.interaction-bar:not(.is-expanded) .action-section {
  width: auto;
  margin-left: auto;
}

.interaction-bar:not(.is-expanded) .input-box {
  height: 40px;
}

.icon-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  color: #333;
  width: 40px;
}

.icon-item svg {
  width: 24px;
  height: 24px;
  display: block;
}

.icon-item .count {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-top: 2px;
  line-height: 1;
}

.icon-item:hover {
  color: #00AEEC;
}

.icon-item.active {
  color: #FF4757;
}

.icon-item.active .count {
  color: #FF4757;
}

.edit-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tool-btn {
  cursor: pointer;
  color: #666;
  padding: 4px;
  display: flex;
  align-items: center;
}

.tool-btn:hover {
  color: #00AEEC;
}

.cancel-btn {
  background: none;
  border: none;
  color: #61666D;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
}

.cancel-btn:hover {
  color: #18191C;
}

.send-btn {
  color: #fff;
  background: #00AEEC;
  border: none;
  border-radius: 20px;
  padding: 6px 20px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.send-btn:disabled {
  background: #A0DFFE;
  cursor: not-allowed;
  opacity: 0.7;
}

.send-btn:not(:disabled):hover {
  background: #009CD6;
  transform: translateY(-1px);
}

.media-dots {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.media-dots span {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
}

.media-dots span.active {
  background: #fff;
  width: 18px;
  border-radius: 4px;
}

.media-fade-enter-active, .media-fade-leave-active {
  transition: opacity 0.3s ease;
}

.media-fade-enter-from, .media-fade-leave-to {
  opacity: 0;
}

.detail-zoom-enter-active, .detail-zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.detail-zoom-enter-from, .detail-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>