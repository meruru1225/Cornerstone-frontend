<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getMyPostsApi, searchMyPostsApi, type PostItem } from '../api/post'
import { getPostActionStateApi } from '../api/post-action'
import { getPostMetric7d, getPostMetric30d, type MetricItem } from '../api/metric'
import PostLine from '../components/PostLine.vue'
import TrendDashboard from '../components/TrendDashboard.vue'

const posts = ref<PostItem[]>([])
const selectedPostId = ref<number | null>(null)
const viewMode = ref<'list' | 'detail'>('list')
const loading = ref(true)
const searchKeyword = ref('')
const metric7d = ref({
  likes: [] as MetricItem[],
  comments: [] as MetricItem[],
  collects: [] as MetricItem[],
  views: [] as MetricItem[]
})
const metric30d = ref({
  likes: [] as MetricItem[],
  comments: [] as MetricItem[],
  collects: [] as MetricItem[],
  views: [] as MetricItem[]
})

const currentRange = ref<'7d' | '30d'>('7d')
const currentMetric = ref<'likes' | 'comments' | 'collects' | 'views'>('likes')

const metricOptions = [
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'collects', label: '收藏' },
  { key: 'views', label: '浏览' }
] as const

const currentMetricLabel = computed(() => {
  return metricOptions.find(option => option.key === currentMetric.value)?.label ?? ''
})

const selectedPost = computed(() => posts.value.find(post => post.id === selectedPostId.value) || null)

const currentList = computed(() => {
  const data = currentRange.value === '7d' ? metric7d.value : metric30d.value
  return data[currentMetric.value]
})

const enrichPostStats = async (list: PostItem[]) => {
  if (list.length === 0) return
  await Promise.all(
    list.map(async (post) => {
      if (!post?.id) return
      try {
        const res: any = await getPostActionStateApi(post.id, false)
        const data = res.data || res
        if (data) {
          post.like_count = data.like_count ?? post.like_count ?? 0
          post.comment_count = data.comment_count ?? post.comment_count ?? 0
          post.collect_count = data.collect_count ?? post.collect_count ?? 0
          post.view_count = data.view_count ?? post.view_count ?? 0
        }
      } catch (e) {
      }
    })
  )
}

const fetchPosts = async () => {
  loading.value = true
  try {
    const keyword = searchKeyword.value.trim()
    const res: any = keyword ? await searchMyPostsApi(keyword) : await getMyPostsApi()
    const responseData = res.data || res
    const postList = responseData?.list || responseData || []
    posts.value = Array.isArray(postList) ? postList : []
    await enrichPostStats(posts.value)
  } catch (e) {
    posts.value = []
  } finally {
    loading.value = false
  }
}

const loadMetrics = async (postId: number) => {
  loading.value = true
  try {
    const [weekRes, monthRes] = await Promise.all([
      getPostMetric7d(postId),
      getPostMetric30d(postId)
    ])
    const week = weekRes?.data || weekRes || {}
    const month = monthRes?.data || monthRes || {}
    metric7d.value = {
      likes: Array.isArray(week.likes) ? week.likes : [],
      comments: Array.isArray(week.comments) ? week.comments : [],
      collects: Array.isArray(week.collects) ? week.collects : [],
      views: Array.isArray(week.views) ? week.views : []
    }
    metric30d.value = {
      likes: Array.isArray(month.likes) ? month.likes : [],
      comments: Array.isArray(month.comments) ? month.comments : [],
      collects: Array.isArray(month.collects) ? month.collects : [],
      views: Array.isArray(month.views) ? month.views : []
    }
  } catch (e) {
    metric7d.value = { likes: [], comments: [], collects: [], views: [] }
    metric30d.value = { likes: [], comments: [], collects: [], views: [] }
  } finally {
    loading.value = false
  }
}

const selectPost = (postId: number) => {
  selectedPostId.value = postId
  viewMode.value = 'detail'
}

const handleViewTrend = (postId: number) => {
  selectedPostId.value = postId
  viewMode.value = 'detail'
}

const handleSearch = () => {
  fetchPosts()
}

const backToList = () => {
  viewMode.value = 'list'
}

onMounted(async () => {
  await fetchPosts()
})

watch(selectedPostId, async (val) => {
  if (val) {
    await loadMetrics(val)
  }
})

</script>

<template>
  <div class="dashboard-view">
    <div class="header">
      <div class="title-row">
        <button v-if="viewMode === 'detail'" class="back-btn" @click="backToList">返回列表</button>
        <h2>帖子数据</h2>
      </div>
      <div v-if="viewMode === 'detail'" class="range-toggle">
        <button :class="{ active: currentRange === '7d' }" @click="currentRange = '7d'">近7天</button>
        <button :class="{ active: currentRange === '30d' }" @click="currentRange = '30d'">近30天</button>
      </div>
      <div v-else class="search-bar">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索我的帖子"
          @keyup.enter="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">搜索</button>
      </div>
    </div>

    <div v-if="posts.length === 0" class="empty-state">
      暂无帖子数据
    </div>
    <div v-else>
      <div v-if="viewMode === 'list'" class="post-list">
        <PostLine
          v-for="post in posts"
          :key="post.id"
          :post="post"
          :selected="post.id === selectedPostId"
          :show-trend="true"
          :show-edit="false"
          @select="selectPost"
          @view-trend="handleViewTrend"
        />
      </div>
      <div v-else class="detail-view">
        <div v-if="selectedPost" class="post-preview">
          <PostLine :post="selectedPost" :selected="true" :show-trend="true" :show-edit="false" />
        </div>
        <div class="metric-toggle">
          <button
            v-for="option in metricOptions"
            :key="option.key"
            :class="{ active: currentMetric === option.key }"
            @click="currentMetric = option.key"
          >
            {{ option.label }}
          </button>
        </div>
        <TrendDashboard
          :data="currentList"
          :loading="loading"
          :total-title="`${currentMetricLabel}总量趋势`"
          :delta-title="`${currentMetricLabel}新增趋势`"
          :total-value-label="`${currentMetricLabel}总量`"
          :delta-value-label="`新增${currentMetricLabel}`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
}

.back-btn {
  border: none;
  background: #F4F6F8;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #61666D;
  cursor: pointer;
  font-weight: 600;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 260px;
  justify-content: flex-end;
}

.search-input {
  flex: 1;
  max-width: 320px;
  border: 1px solid #E3E5E7;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: #00AEEC;
  box-shadow: 0 0 0 2px rgba(0, 174, 236, 0.12);
}

.search-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}

.empty-state {
  background: #ffffff;
  border-radius: 18px;
  padding: 40px;
  text-align: center;
  color: #9499A0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-preview {
  margin-bottom: 16px;
}

.range-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F4F6F8;
  padding: 4px;
  border-radius: 999px;
}

.range-toggle button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #61666D;
  cursor: pointer;
  font-weight: 600;
}

.range-toggle button.active {
  background: #ffffff;
  color: #18191C;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.metric-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.metric-toggle button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #61666D;
  cursor: pointer;
  font-weight: 600;
}

.metric-toggle button.active {
  background: #00AEEC;
  color: #ffffff;
}

</style>
