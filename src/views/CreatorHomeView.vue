<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue'
import TrendDashboard from '../components/TrendDashboard.vue'
import { useUserStore } from '../stores/user'
import { getMyPostsApi, getMyPostsCountApi, type PostItem } from '../api/post'
import { getFollowersCountApi, getFollowingsCountApi } from '../api/relation'
import { getUserMetric7d, type MetricItem } from '../api/metric'

const userStore = useUserStore()
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const posts = ref<PostItem[]>([])
const loading = ref(true)
const showPostDetail = ref(false)
const selectedPostId = ref<number | null>(null)
const trendLoading = ref(true)
const weekFans = ref<MetricItem[]>([])

const stats = ref({
  followers: 0,
  following: 0,
  posts: 0
})

const userInfo = computed(() => userStore.userInfo)

const handlePostClick = (id: number) => {
  selectedPostId.value = id
  showPostDetail.value = true
}

const fetchData = async () => {
  loading.value = true
  trendLoading.value = true
  try {
    const [postsRes, countRes, followersRes, followingRes, metricRes] = await Promise.all([
      getMyPostsApi(),
      getMyPostsCountApi(),
      getFollowersCountApi(),
      getFollowingsCountApi(),
      getUserMetric7d()
    ])
    const responseData = postsRes.data || postsRes
    const postList = responseData?.list || responseData || []
    posts.value = Array.isArray(postList) ? postList.slice(0, 3) : []
    const countData = countRes?.data ?? countRes
    stats.value.posts = countData?.count ?? 0
    stats.value.followers = followersRes.data?.count || 0
    stats.value.following = followingRes.data?.count || 0
    const metricBody = metricRes?.data ?? metricRes
    const metricList = Array.isArray(metricBody)
      ? metricBody
      : Array.isArray(metricBody?.data)
        ? metricBody.data
        : Array.isArray(metricBody?.fans)
          ? metricBody.fans
          : []
    weekFans.value = metricList
  } catch (e) {
    posts.value = []
    weekFans.value = []
  } finally {
    loading.value = false
    trendLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="creator-home">
    <div class="main-column">
      <section class="profile-card" v-if="userInfo">
        <img class="avatar" :src="userInfo.avatar_url || defaultAvatar" alt="avatar" />
        <div class="profile-info">
          <div class="name-row">
            <h2 class="nickname">{{ userInfo.nickname }}</h2>
            <span class="uid">UID {{ userInfo.user_id }}</span>
          </div>
          <p class="bio">{{ userInfo.bio || '这个人很神秘，什么都没写' }}</p>
          <div class="meta-row">
            <span v-if="userInfo.region">{{ userInfo.region }}</span>
            <span v-if="userInfo.gender === 1">男</span>
            <span v-else-if="userInfo.gender === 2">女</span>
            <span v-else>保密</span>
          </div>
        </div>
        <div class="stat-group">
          <div class="stat-item">
            <div class="stat-value">{{ stats.posts }}</div>
            <div class="stat-label">帖子</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.followers }}</div>
            <div class="stat-label">粉丝</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.following }}</div>
            <div class="stat-label">关注</div>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="section-header">
          <h3>我的帖子</h3>
          <span class="count">{{ stats.posts }} 条</span>
        </div>
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else-if="posts.length === 0" class="empty-state">
          暂无内容，快去发布第一篇帖子
        </div>
        <div v-else>
          <PostGrid :posts="posts" @post-click="handlePostClick" />
        </div>
      </section>

      <section class="trend-card">
        <div class="section-header">
          <h3>粉丝总量趋势</h3>
          <span class="count">近7天</span>
        </div>
        <TrendDashboard
          :data="weekFans"
          :loading="trendLoading"
          total-title="粉丝总量趋势"
          delta-title="粉丝新增趋势"
          total-value-label="粉丝总量"
          delta-value-label="新增粉丝"
          :show-delta="false"
        />
      </section>
    </div>

    <aside class="side-column">
      <section class="guide-card">
        <div class="guide-title">社区守则</div>
        <ul class="guide-list">
          <li>尊重他人，友善交流，禁止人身攻击与歧视言论</li>
          <li>分享原创与高质量内容，禁止抄袭与搬运</li>
          <li>禁止发布违法违规、低俗暴力或侵权内容</li>
          <li>理性讨论，拒绝引战与恶意刷屏</li>
          <li>如有争议，优先使用举报与反馈渠道</li>
          <li>请勿泄露他人隐私信息，包括联系方式与住址</li>
          <li>禁止发布与主题无关的广告与营销内容</li>
          <li>引用外部内容需注明出处，避免侵权风险</li>
          <li>不发布虚假信息，避免误导与引发争议</li>
          <li>避免重复发帖与刷屏，保持讨论质量</li>
          <li>对他人作品给予尊重与正向反馈</li>
          <li>禁止引导站外交易或私下转移话题</li>
          <li>遇到问题可通过站内反馈渠道求助</li>
        </ul>
      </section>
    </aside>

    <PostDetail v-model="showPostDetail" :postId="selectedPostId" />
  </div>
</template>

<style scoped>
.creator-home {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.main-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 760px;
}

.side-column {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
}

.uid {
  font-size: 12px;
  color: #9499A0;
  background: #F4F6F8;
  padding: 2px 8px;
  border-radius: 999px;
}

.bio {
  margin: 0;
  color: #61666D;
  font-size: 14px;
}

.meta-row {
  display: flex;
  gap: 12px;
  color: #9499A0;
  font-size: 12px;
}

.stat-group {
  display: flex;
  gap: 18px;
}

.stat-item {
  background: #F8FAFC;
  border-radius: 14px;
  padding: 12px 16px;
  text-align: center;
  min-width: 72px;
}

.stat-value {
  font-weight: 800;
  font-size: 18px;
  color: #18191C;
}

.stat-label {
  font-size: 12px;
  color: #9499A0;
}

.content-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  min-height: 480px;
}

.trend-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.guide-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 24px;
}

.guide-title {
  font-size: 16px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 16px;
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  color: #61666D;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #18191C;
}

.count {
  font-size: 12px;
  color: #9499A0;
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
  text-align: center;
  color: #9499A0;
  padding: 60px 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .creator-home {
    flex-direction: column;
  }

  .main-column,
  .side-column {
    max-width: 100%;
    width: 100%;
  }

  .guide-card {
    position: static;
  }
}
</style>
