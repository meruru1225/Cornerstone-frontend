<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue'
import {useRouter} from 'vue-router'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue'
import {
  getRecommendPostsApi,
  getPostsByTagApi,
  getLatestPostsApi,
  type PostItem
} from '../api/post'

const router = useRouter()

const tags = [
  {id: 0, name: '推荐'},
  {id: -1, name: '最新'},
  {id: 1, name: '编程开发'}, {id: 2, name: '科技数码'},
  {id: 3, name: '互联网'}, {id: 4, name: '美食探店'}, {id: 5, name: '旅行摄影'},
  {id: 6, name: '时尚穿搭'}, {id: 7, name: '萌宠生活'}, {id: 8, name: '游戏电竞'},
  {id: 9, name: '二次元'}, {id: 10, name: '运动健身'}, {id: 11, name: '职场成长'}
]

const activeTagId = ref(0)
const searchQuery = ref('')
const posts = ref<PostItem[]>([])
const loading = ref(true)

const isDetailVisible = ref(false)
const currentPostId = ref<number | null>(null)

// --- 标签栏滚动逻辑 ---
const scrollRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const checkScroll = () => {
  if (!scrollRef.value) return
  const {scrollLeft, scrollWidth, clientWidth} = scrollRef.value
  canScrollLeft.value = scrollLeft > 5
  canScrollRight.value = scrollLeft < (scrollWidth - clientWidth - 5)
}

const scroll = (direction: 'left' | 'right') => {
  if (!scrollRef.value) return
  const scrollAmount = 400
  scrollRef.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
}

const handleSearchJump = () => {
  if (!searchQuery.value.trim()) return
  router.push({
    path: '/search',
    query: {q: searchQuery.value.trim()}
  })
}

// [修改] 加载内容逻辑：增加对“最新” ID 的分流处理
const fetchPosts = async () => {
  loading.value = true
  try {
    let res: any
    if (activeTagId.value === 0) {
      // 推荐
      res = await getRecommendPostsApi()
    } else if (activeTagId.value === -1) {
      // [新增] 调用最新帖子接口
      res = await getLatestPostsApi()
    } else {
      // 普通标签
      const tagName = tags.find(t => t.id === activeTagId.value)?.name || ''
      res = await getPostsByTagApi({tag: tagName, is_main: true})
    }
    posts.value = res.data?.list || res.list || []
  } catch (error) {
    posts.value = []
  } finally {
    loading.value = false
  }
}

const handlePostClick = (id: number) => {
  currentPostId.value = id
  isDetailVisible.value = true
}

onMounted(() => {
  fetchPosts()
  setTimeout(checkScroll, 100)
  window.addEventListener('resize', checkScroll)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScroll)
})
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="g-search-container">
        <div class="g-search-capsule">
          <input
              type="text"
              v-model="searchQuery"
              placeholder="在 Cornerstone 发现灵感..."
              @keyup.enter="handleSearchJump"
          />
          <button class="g-search-btn" @click="handleSearchJump">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="tag-nav-wrapper" :class="{ 'has-left': canScrollLeft, 'has-right': canScrollRight }">
      <Transition name="fade">
        <button v-if="canScrollLeft" class="scroll-btn left" @click="scroll('left')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
      </Transition>

      <nav ref="scrollRef" class="tag-scroller" @scroll="checkScroll">
        <div
            v-for="tag in tags" :key="tag.id"
            class="tag-item" :class="{ active: activeTagId === tag.id }"
            @click="activeTagId = tag.id; fetchPosts()"
        >
          {{ tag.name }}
        </div>
      </nav>

      <Transition name="fade">
        <button v-if="canScrollRight" class="scroll-btn right" @click="scroll('right')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </Transition>
    </div>

    <div class="content-feed">
      <PostGrid :posts="posts" :loading="loading" @post-click="handlePostClick"/>
    </div>

    <PostDetail v-model="isDetailVisible" :postId="currentPostId"/>
  </div>
</template>

<style scoped>
.home-page {
  padding: 0 20px 20px;
}

.home-header {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.tag-nav-wrapper {
  position: relative;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  padding: 0 10px;
}

.tag-scroller {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 10px 0;
  scrollbar-width: none;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
}

.tag-scroller::-webkit-scrollbar {
  display: none;
}

.tag-item {
  padding: 10px 24px;
  border-radius: 12px;
  background: #F4F6F8;
  color: #61666D;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.tag-item:hover {
  background: #E3E5E7;
  color: #18191C;
}

.tag-item.active {
  background: #00AEEC;
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 174, 236, 0.25);
  font-weight: 700;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #E3E5E7;
  color: #61666D;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.scroll-btn:hover {
  background: #F4F6F8;
  color: #00AEEC;
}

.scroll-btn.left {
  left: 0px;
}

.scroll-btn.right {
  right: 0px;
}

.tag-nav-wrapper::before,
.tag-nav-wrapper::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 60px;
  pointer-events: none;
  z-index: 5;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.tag-nav-wrapper::before {
  left: 0;
  background: linear-gradient(to right, #fff 20%, rgba(255, 255, 255, 0));
}

.tag-nav-wrapper::after {
  right: 0;
  background: linear-gradient(to left, #fff 20%, rgba(255, 255, 255, 0));
}

.tag-nav-wrapper.has-left::before {
  opacity: 1;
}

.tag-nav-wrapper.has-right::after {
  opacity: 1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>