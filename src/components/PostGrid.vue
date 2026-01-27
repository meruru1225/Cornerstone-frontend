<script setup lang="ts">
import {ref, watch, onMounted, onUnmounted} from 'vue'
import PostCard from './PostCard.vue'
import {type PostItem} from '../api/post'
import {getBatchLikesApi} from '../api/post-action'

const props = defineProps<{
  posts: PostItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'post-click', id: number): void
}>()

// --- 瀑布流逻辑 ---
const containerRef = ref<HTMLElement | null>(null)
const columnCount = ref(4) // 默认值
const columns = ref<PostItem[][]>([])

// 估算卡片高度以进行列分配
const getEstimatedHeight = (post: PostItem, colWidth: number) => {
  // 基础高度 (Padding + Title + UserInfo + Actions + Margins)
  const baseHeight = 160 
  
  // 文本高度估算 (假设平均 100px，如果有 plain_content 可以更精确，但不必太完美)
  const textHeight = 80 
  
  // 媒体高度
  let mediaHeight = 0
  if (post.medias && post.medias.length > 0) {
    const m = post.medias[0]
    if (m && m.width && m.height) {
      mediaHeight = (colWidth * m.height) / m.width
    } else {
      mediaHeight = colWidth * 0.75 // 默认 4:3
    }
  } else {
    // 纯文本卡片会有个 placeholder 区域
    return Math.max(160, baseHeight + textHeight)
  }
  
  return baseHeight + mediaHeight
}

const distributePosts = () => {
  if (!props.posts || props.posts.length === 0) {
    columns.value = []
    return
  }
  
  // 初始化列
  const newCols: PostItem[][] = Array.from({length: columnCount.value}, () => [])
  const colHeights = new Array(columnCount.value).fill(0)
  
  // 获取当前列宽 (近似值)
  const containerWidth = containerRef.value?.clientWidth || 1200
  const gap = 20
  const colWidth = (containerWidth - (columnCount.value - 1) * gap) / columnCount.value

  props.posts.forEach(post => {
    // 寻找当前最矮的列
    let minIndex = 0
    let minH = colHeights[0]
    
    for (let i = 1; i < columnCount.value; i++) {
      if (colHeights[i] < minH) {
        minH = colHeights[i]
        minIndex = i
      }
    }
    
    // 放入该列
    const targetCol = newCols[minIndex]
    if (targetCol) {
      targetCol.push(post)
      // 更新该列高度
      colHeights[minIndex] += getEstimatedHeight(post, colWidth) + gap
    }
  })
  
  columns.value = newCols
}

const updateColumnCount = () => {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth
  // 简化的断点逻辑，模仿 minmax(300px, 1fr)
  if (width < 640) {
    columnCount.value = 1
  } else if (width < 960) {
    columnCount.value = 2
  } else if (width < 1280) {
    columnCount.value = 3
  } else {
    columnCount.value = 4
  }
  distributePosts()
}

// 监听 posts 变化重新分布
watch(() => props.posts, () => {
  distributePosts()
}, {deep: true, immediate: true})

// ResizeObserver
let observer: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    updateColumnCount() // 初始计算
    observer = new ResizeObserver(() => {
      // 防抖或直接调用
      updateColumnCount()
    })
    observer.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// --- 点赞状态同步逻辑 ---
watch(() => props.posts, async (newPosts) => {
  if (newPosts && newPosts.length > 0) {
    const ids = newPosts.map(p => p.id)
    try {
      const res = await getBatchLikesApi(ids)
      const statusData = res.data || (res as any)

      if (Array.isArray(statusData)) {
        statusData.forEach((status, index) => {
          if (newPosts[index]) {
            newPosts[index].like_count = status.like_count
            newPosts[index].is_liked = status.is_liked
          }
        })
      }
    } catch (e) {
      console.error('批量获取帖子状态失败:', e)
    }
  }
}, {immediate: true, deep: true})
</script>

<template>
  <div class="grid-wrapper">
    <div v-if="loading" class="loading-placeholder">
      <div class="spinner"></div>
    </div>
    <div v-else class="masonry-container" ref="containerRef">
      <div 
        class="masonry-column" 
        v-for="(col, colIndex) in columns" 
        :key="colIndex"
      >
        <PostCard
            v-for="post in col"
            :key="post.id"
            :post="post"
            @click="(id) => emit('post-click', id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.masonry-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  width: 100%;
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.loading-placeholder {
  display: flex;
  justify-content: center;
  padding: 50px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #00AEEC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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