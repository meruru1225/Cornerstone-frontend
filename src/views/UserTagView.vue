<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue'
import { getPostsByTagApi, type PostItem } from '../api/post'

const route = useRoute()
const router = useRouter()

// 状态
const tagName = ref('')
const posts = ref<PostItem[]>([])
const loading = ref(false)
const keyword = ref('') // 顶部搜索框

// 详情页状态
const isDetailVisible = ref(false)
const currentPostId = ref<number | null>(null)

// 1. 初始化：获取路由参数中的标签名
const initTag = () => {
  const tag = route.query.tag as string
  if (tag) {
    tagName.value = tag
    fetchTagPosts(tag)
  }
}

// 2. 获取标签下的帖子
const fetchTagPosts = async (tag: string) => {
  loading.value = true
  try {
    const res: any = await getPostsByTagApi({
      tag,
      is_main: false, // 关键：标签页不强制只查主贴，或者根据需求调整
      page: 1,
      page_size: 50
    })
    posts.value = res.data?.list || res.list || []
  } catch (error) {
    console.error('获取标签帖子失败', error)
  } finally {
    loading.value = false
  }
}

// 3. 搜索逻辑：跳转到搜索页
const handleSearchJump = () => {
  if (!keyword.value.trim()) return
  router.push({ path: '/search', query: { q: keyword.value.trim() } })
}

// 4. 点击帖子
const handlePostClick = (id: number) => {
  currentPostId.value = id
  isDetailVisible.value = true
}

// 5. 监听路由变化（防止同页跳转不刷新）
watch(() => route.query.tag, (newTag) => {
  if (newTag) {
    tagName.value = newTag as string
    fetchTagPosts(newTag as string)
  }
})

onMounted(() => {
  initTag()
})
</script>

<template>
  <div class="tag-view">
    <header class="sticky-header">
      <div class="g-search-container">
        <div class="g-search-capsule">
          <input
              type="text"
              v-model="keyword"
              placeholder="搜索灵感..."
              @keyup.enter="handleSearchJump"
          />
          <button class="g-search-btn" @click="handleSearchJump">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="tag-content">
      <div class="tag-banner">
        <div class="banner-inner">
          <div class="hash-symbol">#</div>
          <div class="tag-info">
            <h1 class="tag-title">{{ tagName }}</h1>
            <p class="tag-meta">共 {{ posts.length }} 条相关内容</p>
          </div>
        </div>
        <div class="bg-circle c1"></div>
        <div class="bg-circle c2"></div>
      </div>

      <div class="list-section">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="posts.length > 0">
          <PostGrid :posts="posts" @post-click="handlePostClick" />
        </div>

        <div v-else class="empty-state">
          <img src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" alt="empty" />
          <p>该话题下暂无内容</p>
        </div>
      </div>
    </div>

    <PostDetail v-model="isDetailVisible" :postId="currentPostId" />
  </div>
</template>

<style scoped>
.tag-view {
  min-height: 100vh;
  background: #fff;
}

.sticky-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  z-index: 50;
  padding: 16px 20px;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.tag-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* 标签头图样式 */
.tag-banner {
  position: relative;
  background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%); /* 清新蓝绿渐变 */
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(132, 250, 176, 0.3);
  display: flex;
  align-items: center;
}

.banner-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 20px;
}

.hash-symbol {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #fff;
  font-weight: 900;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.tag-title {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.tag-meta {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

/* 背景装饰球 */
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  pointer-events: none;
}
.c1 { width: 200px; height: 200px; top: -50px; right: -50px; }
.c2 { width: 100px; height: 100px; bottom: -20px; right: 120px; }

/* 列表状态样式 */
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

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #9499A0;
}

.empty-state img {
  width: 200px;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>