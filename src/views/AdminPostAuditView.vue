<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PostLine from '../components/PostLine.vue'
import PostDetail from '../components/PostDetail.vue'
import { auditPostApi, getAuditListApi, type PostItem } from '../api/post'

const posts = ref<PostItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const selectedPostId = ref<number | null>(null)
const showPostDetail = ref(false)

const fetchPosts = async (append = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  try {
    const lastId = append ? posts.value[posts.value.length - 1]?.id : undefined
    const res: any = await getAuditListApi({ last_id: lastId, page_size: 20 })
    const payload = res.data || res
    const data = payload.data || payload
    const list = data.list || data || []
    const more = data.has_more ?? false
    const normalized = Array.isArray(list) ? list : []
    posts.value = append ? posts.value.concat(normalized) : normalized
    hasMore.value = !!more
  } catch (error: any) {
    if (!append) posts.value = []
    ElMessage.error(error?.message || '获取审核列表失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const handleSelect = (id: number) => {
  selectedPostId.value = id
}

const handleView = (id: number) => {
  selectedPostId.value = id
  showPostDetail.value = true
}

const handleApprove = async (id: number) => {
  try {
    await auditPostApi({ post_id: id, status: 1 })
    posts.value = posts.value.filter(item => item.id !== id)
    ElMessage.success('已通过')
  } catch (error: any) {
    ElMessage.error(error?.message || '审批失败')
  }
}

const handleReject = async (id: number) => {
  try {
    await auditPostApi({ post_id: id, status: 3 })
    posts.value = posts.value.filter(item => item.id !== id)
    ElMessage.success('已拒绝')
  } catch (error: any) {
    ElMessage.error(error?.message || '审批失败')
  }
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  fetchPosts(true)
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="admin-view">
    <div class="admin-header">
      <div class="title-area">
        <h2>帖子审核队列</h2>
        <span class="count">{{ posts.length }} 条</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="list-section">
      <div v-if="posts.length === 0" class="empty-state">暂无待审核帖子</div>
      <div v-else class="post-list">
        <PostLine
          v-for="post in posts"
          :key="post.id"
          :post="post"
          :selected="post.id === selectedPostId"
          action-mode="audit"
          :show-status="true"
          :show-trend="false"
          :show-edit="false"
          @select="handleSelect"
          @view="handleView"
          @approve="handleApprove"
          @reject="handleReject"
        />
      </div>
      <div v-if="hasMore" class="load-more">
        <button class="ghost-btn" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <PostDetail v-model="showPostDetail" :postId="selectedPostId" />
  </div>
</template>

<style scoped>
.admin-view {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-area h2 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  color: #18191C;
}

.count {
  font-size: 13px;
  color: #9499A0;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.ghost-btn {
  background: #F4F6F8;
  color: #61666D;
  border: none;
  padding: 10px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
}

.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: #9499A0;
  border: 1px dashed #E3E5E7;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
