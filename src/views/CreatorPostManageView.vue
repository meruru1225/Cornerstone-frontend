<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PostLine from '../components/PostLine.vue'
import PostDetail from '../components/PostDetail.vue'
import { getMyPostsApi, searchMyPostsApi, deletePostApi, type PostItem } from '../api/post'
import { getPostActionStateApi } from '../api/post-action'

const router = useRouter()
const posts = ref<PostItem[]>([])
const loading = ref(true)
const showPostDetail = ref(false)
const selectedPostId = ref<number | null>(null)
const searchKeyword = ref('')
const currentTab = ref<'all' | 'published' | 'review' | 'rejected'>('all')

const handleSelect = (id: number) => {
  selectedPostId.value = id
}

const handleView = (id: number) => {
  selectedPostId.value = id
  showPostDetail.value = true
}

const handleEditItem = (id: number) => {
  router.push({ path: '/creator/publish', query: { id: id.toString() } })
}

const handleDeleteItem = (id: number) => {
  ElMessageBox.confirm(
    '确定要删除这条帖子吗？此操作无法恢复。',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await deletePostApi(id)
        ElMessage.success('删除成功')
        fetchPosts()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

const handleSearch = () => {
  fetchPosts()
}

const filteredPosts = computed(() => {
  const list = posts.value
  if (currentTab.value === 'all') return list
  if (currentTab.value === 'published') return list.filter(item => item.status === 1)
  if (currentTab.value === 'review') return list.filter(item => item.status === 0 || item.status === 2)
  return list.filter(item => item.status === 3)
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

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="manage-view">
    <div class="manage-container">
      <div class="header">
        <div class="title-area">
          <h2>帖子管理</h2>
          <span class="count">{{ filteredPosts.length }} 条</span>
        </div>
        <div class="search-bar">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索我的帖子"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab-item" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">全部帖子</div>
        <div class="tab-item" :class="{ active: currentTab === 'published' }" @click="currentTab = 'published'">已发布</div>
        <div class="tab-item" :class="{ active: currentTab === 'review' }" @click="currentTab = 'review'">审核中</div>
        <div class="tab-item" :class="{ active: currentTab === 'rejected' }" @click="currentTab = 'rejected'">未通过</div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>
      <div v-else-if="filteredPosts.length === 0" class="empty-state">
        暂无帖子
      </div>
      <div v-else class="post-list">
        <PostLine
        v-for="post in filteredPosts"
          :key="post.id"
          :post="post"
          :selected="post.id === selectedPostId"
        :show-status="currentTab === 'all'"
          :show-edit="true"
          :show-delete="true"
          :show-trend="false"
          @select="handleSelect"
          @view="handleView"
          @edit="handleEditItem"
          @delete="handleDeleteItem"
        />
      </div>

      <PostDetail v-model="showPostDetail" :postId="selectedPostId" />
    </div>
  </div>
</template>

<style scoped>
.manage-view {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 100px);
  padding: 20px 0 56px;
}

.manage-container {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.title-area {
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

.count {
  font-size: 12px;
  color: #9499A0;
  background: #F4F6F8;
  padding: 2px 10px;
  border-radius: 999px;
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

.tabs {
  display: flex;
  align-items: center;
  gap: 22px;
  border-bottom: 1px solid #F0F2F5;
  padding-bottom: 8px;
}

.tab-item {
  padding: 6px 0;
  font-size: 14px;
  color: #61666D;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  font-weight: 500;
}

.tab-item.active {
  color: #00AEEC;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 3px;
  background: #00AEEC;
  border-radius: 2px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #E3E5E7;
  border-top-color: #00AEEC;
  animation: spin 1s linear infinite;
}

.empty-state {
  background: #ffffff;
  border-radius: 20px;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
