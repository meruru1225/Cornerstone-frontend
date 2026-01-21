<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {useUserStore} from '../stores/user'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue' // [关键]: 引入弹窗组件
import {getUserHomeApi, type UserHomeInfo} from '../api/user'
import {
  checkIsFollowApi,
  followUserApi,
  unfollowUserApi,
  getFollowersCountApi,
  getFollowingsCountApi
} from '../api/relation'
import {getUserPostsApi, getMyPostsApi, type PostItem} from '../api/post'
import {getLikedPostsApi, getCollectedPostsApi} from '../api/post-action'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// --- 状态 ---
const loadingProfile = ref(true)
const loadingPosts = ref(false)
const userInfo = ref<UserHomeInfo | null>(null)
const isFollowing = ref(false)
const posts = ref<PostItem[]>([])

// [关键]: 控制详情弹窗显示的变量，保持 MainLayout 形式
const showPostDetail = ref(false)
const selectedPostId = ref<number | null>(null)

// 统计数据
const stats = ref({
  following: 0,
  followers: 0
})

const activeTab = ref('works') // 'works' | 'likes' | 'collects'

// --- 计算属性 ---
const currentUserId = computed(() => {
  const id = route.query.id
  return id ? Number(id) : userStore.userInfo?.user_id
})

const isMe = computed(() => {
  return userStore.isLoggedIn && userStore.userInfo?.user_id === currentUserId.value
})

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// --- 数据获取 ---

const fetchProfileData = async () => {
  const id = currentUserId.value
  if (!id) return

  loadingProfile.value = true
  try {
    const [userRes, followingRes, followerRes] = await Promise.all([
      getUserHomeApi(id),
      getFollowingsCountApi(id),
      getFollowersCountApi(id)
    ])

    userInfo.value = (userRes as any).data

    const followingData = (followingRes as any).data || followingRes
    const followerData = (followerRes as any).data || followerRes

    stats.value.following = followingData?.count || 0
    stats.value.followers = followerData?.count || 0

    if (!isMe.value && userStore.isLoggedIn) {
      try {
        const followRes: any = await checkIsFollowApi(id)
        isFollowing.value = !!(followRes.data !== undefined ? followRes.data : followRes)
      } catch (e) {
      }
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取用户信息失败')
  } finally {
    loadingProfile.value = false
  }
}

const fetchPosts = async () => {
  const id = currentUserId.value
  if (!id) return

  loadingPosts.value = true
  try {
    let res: any

    if (activeTab.value === 'works') {
      if (isMe.value) {
        // 如果是本人，请求 /posts/self 包含审核中内容
        res = await getMyPostsApi()
      } else {
        res = await getUserPostsApi(id, {page: 1, page_size: 50})
      }
    } else if (activeTab.value === 'likes') {
      res = await getLikedPostsApi(id)
    } else if (activeTab.value === 'collects') {
      res = await getCollectedPostsApi(id)
    }

    const responseData = res.data || res
    posts.value = responseData?.list || responseData || []
  } catch (error) {
    console.error('获取帖子失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    loadingPosts.value = false
  }
}

// --- 交互逻辑 ---

const handleFollow = async () => {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  if (!userInfo.value) return

  const originalState = isFollowing.value
  isFollowing.value = !originalState

  try {
    if (originalState) {
      await unfollowUserApi(userInfo.value.user_id)
      stats.value.followers = Math.max(0, stats.value.followers - 1)
    } else {
      await followUserApi(userInfo.value.user_id)
      stats.value.followers++
    }
  } catch (error) {
    isFollowing.value = originalState
    ElMessage.error('操作失败')
  }
}

const handleEditProfile = () => {
  router.push('/settings/profile')
}

const handleTabChange = (tab: string) => {
  activeTab.value = tab
  fetchPosts()
}

// [修复]: 绑定到 PostGrid 的点击事件，使用弹窗展示详情以保留 Sidebar
const handlePostClick = (postId: number) => {
  selectedPostId.value = postId
  showPostDetail.value = true
}

watch(() => route.query.id, (newId) => {
  if (newId) {
    activeTab.value = 'works'
    fetchProfileData()
    fetchPosts()
  }
})

onMounted(() => {
  if (!currentUserId.value) {
    router.replace('/login')
    return
  }
  fetchProfileData()
  fetchPosts()
})
</script>

<template>
  <div class="space-view">

    <div v-if="loadingProfile" class="loading-container">
      <div class="spinner"></div>
    </div>

    <div v-else-if="userInfo" class="space-container">

      <div class="profile-header-card">
        <div class="header-left">
          <img :src="userInfo.avatar_url || defaultAvatar" class="avatar-img" alt="avatar"/>

          <div class="info-group">
            <div class="name-line">
              <h1 class="nickname">{{ userInfo.nickname }}</h1>
              <span class="gender-tag" v-if="userInfo.gender !== 0">
                {{ userInfo.gender === 1 ? '♂' : '♀' }}
              </span>
            </div>

            <div class="uid-line">
              <span class="uid-text">UID: {{ userInfo.user_id }}</span>
              <span class="region-text" v-if="userInfo.region">
                <svg viewBox="0 0 24 24" width="12" height="12" style="margin-right: 2px; transform: translateY(1px);">
                  <path fill="currentColor"
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {{ userInfo.region }}
              </span>
            </div>

            <p class="bio-text">{{ userInfo.bio || '这个人很神秘，什么都没写' }}</p>

            <div class="action-line">
              <template v-if="isMe">
                <button class="action-btn edit-btn" @click="handleEditProfile">编辑资料</button>
              </template>
              <template v-else>
                <button
                    class="action-btn follow-btn"
                    :class="{ 'is-following': isFollowing }"
                    @click="handleFollow"
                >
                  <span v-if="isFollowing">已关注</span>
                  <span v-else>+ 关注</span>
                </button>
                <button class="action-btn chat-btn">私信</button>
              </template>
            </div>
          </div>
        </div>

        <div class="header-right">
          <div class="stat-box">
            <div class="stat-num">{{ stats.following }}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="divider-v"></div>
          <div class="stat-box">
            <div class="stat-num">{{ stats.followers }}</div>
            <div class="stat-label">粉丝</div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="tabs-header">
          <div
              class="tab-item"
              :class="{ active: activeTab === 'works' }"
              @click="handleTabChange('works')"
          >动态
          </div>
          <div
              class="tab-item"
              :class="{ active: activeTab === 'likes' }"
              @click="handleTabChange('likes')"
          >喜欢
          </div>
          <div
              class="tab-item"
              :class="{ active: activeTab === 'collects' }"
              @click="handleTabChange('collects')"
          >收藏
          </div>
        </div>

        <div class="posts-wrapper">
          <div v-if="loadingPosts" class="loading-state">
            <div class="spinner"></div>
          </div>

          <div v-else-if="posts.length > 0">
            <PostGrid :posts="posts" :loading="false" @post-click="handlePostClick"/>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" width="60" height="60">
                <path fill="#E3E5E7"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
              </svg>
            </div>
            <p>暂无相关内容</p>
          </div>
        </div>
      </div>
    </div>

    <PostDetail
        v-model="showPostDetail"
        :postId="selectedPostId"
    />
  </div>
</template>

<style scoped>
.space-view {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.profile-header-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  gap: 24px;
  flex: 1;
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.info-group {
  display: flex;
  flex-direction: column;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.nickname {
  font-size: 24px;
  font-weight: 700;
  color: #18191C;
  margin: 0;
  line-height: 1.2;
}

.gender-tag {
  font-size: 12px;
  background: #F4F6F8;
  color: #00AEEC;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.uid-line {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #9499A0;
  margin-bottom: 12px;
}

.region-text {
  display: flex;
  align-items: center;
  gap: 2px;
}

.bio-text {
  font-size: 14px;
  color: #61666D;
  line-height: 1.5;
  margin-bottom: 20px;
  max-width: 500px;
}

.action-line {
  display: flex;
  gap: 12px;
}

.action-btn {
  height: 34px;
  padding: 0 24px;
  border-radius: 17px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-btn {
  background: #00AEEC;
  color: #fff;
}

.follow-btn:hover {
  background: #009CD6;
}

.follow-btn.is-following {
  background: #E3E5E7;
  color: #9499A0;
}

.chat-btn, .edit-btn {
  background: #fff;
  border: 1px solid #E3E5E7;
  color: #61666D;
}

.chat-btn:hover, .edit-btn:hover {
  border-color: #00AEEC;
  color: #00AEEC;
}

.header-right {
  display: flex;
  align-items: center;
  padding-top: 10px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  min-width: 60px;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #9499A0;
}

.divider-v {
  width: 1px;
  height: 24px;
  background: #E3E5E7;
}

.content-section {
  background: #fff;
  border-radius: 16px;
  min-height: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #F0F2F5;
  padding: 0 32px;
}

.tab-item {
  padding: 16px 0;
  margin-right: 40px;
  font-size: 16px;
  color: #61666D;
  cursor: pointer;
  position: relative;
  font-weight: 500;
  transition: color 0.2s;
}

.tab-item:hover {
  color: #18191C;
}

.tab-item.active {
  color: #00AEEC;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #00AEEC;
  border-radius: 2px;
}

.posts-wrapper {
  padding: 24px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  color: #9499A0;
}

.empty-icon svg {
  margin-bottom: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #00AEEC;
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