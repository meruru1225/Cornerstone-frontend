<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../api/request'

const tags = [
  { id: 0, name: '推荐' }, { id: 1, name: '编程开发' }, { id: 2, name: '科技数码' },
  { id: 3, name: '互联网' }, { id: 4, name: '美食探店' }, { id: 5, name: '旅行摄影' },
  { id: 6, name: '时尚穿搭' }, { id: 7, name: '萌宠生活' }, { id: 8, name: '游戏电竞' },
  { id: 9, name: '二次元' }, { id: 10, name: '运动健身' }, { id: 11, name: '职场成长' }
]

const activeTagId = ref(0)
const searchQuery = ref('')
const posts = ref<any[]>([])
const loading = ref(true)

// 时间格式化：增加“发布于”前缀
const formatRelativeTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr.replace(/-/g, '/'))
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000

  let result = ''
  if (diff < 60) result = '刚刚'
  else if (diff < 3600) result = `${Math.floor(diff / 60)}分钟前`
  else if (diff < 86400) result = `${Math.floor(diff / 3600)}小时前`
  else if (diff < 2592000) result = `${Math.floor(diff / 86400)}天前`
  else result = timeStr.split(' ')[0]

  return `发布于 ${result}`
}

// 动态媒体比例：限制长宽比，防止过长
const getMediaStyle = (media: any) => {
  if (!media || !media.width || !media.height) return { aspectRatio: '1 / 1' }
  const ratio = Math.min(media.height / media.width, 1.35)
  return { aspectRatio: `${1 / ratio}` }
}

const fetchPosts = async () => {
  loading.value = true
  try {
    let url = searchQuery.value.trim()
        ? `/posts/search?keyword=${encodeURIComponent(searchQuery.value)}`
        : (activeTagId.value === 0 ? '/posts/recommend' : `/posts/search?keyword=${encodeURIComponent(tags.find(t => t.id === activeTagId.value)?.name || '')}`)

    const res: any = await request.get(url)
    posts.value = res.data.list || []
  } finally {
    loading.value = false
  }
}

const handleTagClick = (tagId: number) => {
  activeTagId.value = tagId
  fetchPosts()
}

onMounted(() => fetchPosts())
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="search-container">
        <div class="search-capsule">
          <input
              type="text"
              v-model="searchQuery"
              placeholder="在 Cornerstone 发现灵感..."
              @keyup.enter="fetchPosts"
          />
          <button class="search-btn" @click="fetchPosts">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <nav class="tag-scroller">
      <div v-for="tag in tags" :key="tag.id" class="tag-item" :class="{ active: activeTagId === tag.id }" @click="handleTagClick(tag.id)">
        {{ tag.name }}
      </div>
    </nav>

    <div class="content-feed">
      <div v-if="loading" class="loading-placeholder">
        <div class="spinner"></div>
      </div>

      <div v-else class="post-grid">
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="card-user-header">
            <img :src="post.avatar_url" class="mini-avatar" />
            <div class="user-meta">
              <span class="nickname">{{ post.nickname }}</span>
              <span class="post-time">{{ formatRelativeTime(post.created_at) }}</span>
            </div>
          </div>

          <div v-if="post.medias && post.medias.length" class="media-box" :style="getMediaStyle(post.medias[0])">
            <template v-if="post.medias[0].mime_type.includes('video')">
              <video :src="post.medias[0].url" muted loop />
              <div class="video-badge">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                <span>视频</span>
              </div>
            </template>
            <img v-else :src="post.medias[0].url" loading="lazy" />
          </div>

          <div v-else class="text-post-placeholder">
            <div class="art-bg"></div>
            <div class="placeholder-inner">
              <span class="decor-quote">“</span>
              <p class="big-text">{{ post.content }}</p>
              <span class="decor-quote text-right">”</span>
            </div>
            <div class="brand-watermark">CORNERSTONE</div>
          </div>

          <div class="post-body">
            <h3 class="post-title">{{ post.title }}</h3>

            <div class="card-footer">
              <div class="post-tags">
                <span v-for="tag in post.content?.match(/#\S+/g)?.slice(0, 2)" :key="tag" class="inner-tag">{{ tag }}</span>
              </div>
              <div class="likes">
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>{{ post.like_count || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page { display: flex; flex-direction: column; height: 100%; }

/* --- 搜索框：3px 线条 --- */
.home-header { display: flex; justify-content: center; padding: 0 0 32px 0; }
.search-container { width: 100%; max-width: 540px; }
.search-capsule {
  display: flex; align-items: center; background-color: #F1F2F3; border-radius: 14px;
  padding: 6px 6px 6px 20px; transition: all 0.25s; border: 3px solid transparent;
}
.search-capsule:focus-within {
  background-color: #FFFFFF; border-color: #00AEEC; box-shadow: 0 6px 20px rgba(0, 174, 236, 0.12);
}
.search-capsule input { flex: 1; border: none; background: transparent; outline: none; font-size: 15px; color: #18191C; }
.search-btn { width: 38px; height: 38px; border: none; background: #00AEEC; border-radius: 10px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* --- 标签 --- */
.tag-scroller { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 24px; scrollbar-width: none; }
.tag-item { padding: 7px 18px; border-radius: 8px; font-size: 14px; color: #61666D; cursor: pointer; border: 1px solid #E3E5E7; white-space: nowrap; transition: 0.2s; }
.tag-item:hover { border-color: #00AEEC; color: #00AEEC; }
.tag-item.active { background: #00AEEC; color: #FFFFFF; border-color: #00AEEC; box-shadow: 0 4px 12px rgba(0, 174, 236, 0.2); }

/* --- 网格：加大卡片宽度 --- */
.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  align-items: start;
}

.post-card { background: white; border-radius: 16px; border: 1px solid #F1F2F3; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; }
.post-card:hover { transform: translateY(-6px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }

/* --- 头部时间 --- */
.card-user-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.mini-avatar { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #f0f0f0; }
.user-meta { display: flex; flex-direction: column; line-height: 1.3; }
.nickname { font-size: 13px; font-weight: 800; color: #18191C; }
.post-time { font-size: 11px; color: #9499A0; font-weight: 500; }

/* --- 媒体与视频标识 --- */
.media-box { width: 100%; background: #F1F2F5; overflow: hidden; position: relative; }
.media-box img, .media-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
.video-badge {
  position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px); color: white; padding: 4px 8px;
  border-radius: 6px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;
}

/* --- 纯文本占位大升级 --- */
.text-post-placeholder {
  width: 100%; min-height: 200px; padding: 48px 32px;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: #fdfdfd;
}
.art-bg {
  position: absolute; top: -20%; left: -10%; width: 120%; height: 140%;
  background: radial-gradient(circle at 20% 30%, rgba(0, 174, 236, 0.05) 0%, transparent 50%),
  radial-gradient(circle at 80% 70%, rgba(251, 114, 153, 0.05) 0%, transparent 50%);
  filter: blur(40px);
}
.placeholder-inner { position: relative; z-index: 1; text-align: center; }
.decor-quote { font-size: 32px; color: #00AEEC; opacity: 0.15; font-family: "Georgia", serif; display: block; line-height: 0.5; }
.big-text { font-size: 18px; color: #303133; line-height: 1.8; font-weight: 600; letter-spacing: 0.5px; word-break: break-all; margin: 12px 0; }
.brand-watermark {
  position: absolute; bottom: 12px; left: 0; right: 0; text-align: center;
  font-size: 10px; font-weight: 900; color: #00AEEC; opacity: 0.1; letter-spacing: 2px;
}

/* --- 底部 Body --- */
.post-body { padding: 12px 16px 18px; }
.post-title { font-size: 15px; font-weight: 800; color: #18191C; margin-bottom: 8px; line-height: 1.4; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.inner-tag { font-size: 12px; color: #00AEEC; font-weight: 600; margin-right: 8px; }
.likes { display: flex; align-items: center; gap: 5px; color: #9499A0; font-size: 13px; font-weight: 500; }

.loading-placeholder { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 28px; height: 28px; border: 3px solid #F1F2F3; border-top-color: #00AEEC; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>