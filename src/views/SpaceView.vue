<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {useUserStore} from '../stores/user'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue'
import UserGrid from '../components/UserGrid.vue'
import {getUserHomeApi, batchGetUserSimpleApi, type UserHomeInfo} from '../api/user'
import {getConversationsApi, type ConversationItem} from '../api/im'
import {
  checkIsFollowApi,
  followUserApi,
  unfollowUserApi,
  getFollowersCountApi,
  getFollowingsCountApi,
  getFollowersApi,
  getFollowingsApi
} from '../api/relation'
import {getUserPostsApi, getMyPostsApi, type PostItem} from '../api/post'
import {getLikedPostsApi, getCollectedPostsApi} from '../api/post-action'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// --- 基础状态 ---
const loadingProfile = ref(true)
const loadingContent = ref(false)
const userInfo = ref<UserHomeInfo | null>(null)
const isFollowing = ref(false)

// 数据源
const posts = ref<PostItem[]>([])
const relationUsers = ref<UserHomeInfo[]>([])

// --- 弹窗控制 ---
const showPostDetail = ref(false)
const selectedPostId = ref<number | null>(null)

const stats = ref({
  following: 0,
  followers: 0
})

// [核心状态]: 记录当前激活的标签
// 模式 A (作品视图): works, likes, collects
// 模式 B (关系视图): following, followers
const activeTab = ref('works')

// --- 计算属性 ---
const currentUserId = computed(() => {
  const id = route.query.id
  return id ? Number(id) : userStore.userInfo?.user_id
})

const isMe = computed(() => {
  return userStore.isLoggedIn && userStore.userInfo?.user_id === currentUserId.value
})

// 判断当前是否处于关系查看模式
const isRelationView = computed(() => ['following', 'followers'].includes(activeTab.value))

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
    stats.value.following = (followingRes as any).data?.count || 0
    stats.value.followers = (followerRes as any).data?.count || 0
    if (!isMe.value && userStore.isLoggedIn) {
      try {
        const followRes: any = await checkIsFollowApi(id)
        isFollowing.value = !!(followRes.data !== undefined ? followRes.data : followRes)
      } catch (e) {
      }
    }
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  } finally {
    loadingProfile.value = false
  }
}

const fetchTabContent = async () => {
  const id = currentUserId.value
  if (!id) return
  loadingContent.value = true

  posts.value = []
  relationUsers.value = []

  try {
    let res: any
    // 加载帖子类数据
    if (activeTab.value === 'works') {
      res = isMe.value ? await getMyPostsApi() : await getUserPostsApi(id, {page: 1, page_size: 50})
    } else if (activeTab.value === 'likes') {
      res = await getLikedPostsApi(id)
    } else if (activeTab.value === 'collects') {
      res = await getCollectedPostsApi(id)
    }

    // 加载关系类用户数据
    else if (activeTab.value === 'following' || activeTab.value === 'followers') {
      const relationRes: any = activeTab.value === 'following'
          ? await getFollowingsApi({page: 1, page_size: 100})
          : await getFollowersApi({page: 1, page_size: 100})

      const relations = relationRes.data || []
      if (relations.length > 0) {
        const targetIds = relations.map((item: any) =>
            activeTab.value === 'following' ? item.followingId : item.followerId
        )
        const userRes: any = await batchGetUserSimpleApi(targetIds)
        relationUsers.value = userRes.data || []
      }
      loadingContent.value = false
      return
    }

    const responseData = res.data || res
    posts.value = responseData?.list || responseData || []
  } catch (error) {
    console.error('加载失败', error)
  } finally {
    loadingContent.value = false
  }
}

// --- 交互逻辑 ---

const handleStatClick = (type: 'following' | 'followers') => {
  if (!isMe.value) return
  activeTab.value = type
  fetchTabContent()
}

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

const handlePostClick = (postId: number) => {
  selectedPostId.value = postId
  showPostDetail.value = true
}

const handleChatClick = async () => {
  if (!userInfo.value?.user_id) return
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')

  const targetUserId = userInfo.value.user_id
  let conversationId = 0

  try {
    const res: any = await getConversationsApi()
    const list: ConversationItem[] = res.data || []
    const existing = list.find(item => item.peer_id === targetUserId)
    if (existing) conversationId = existing.conversation_id
    if (conversationId) {
      await router.push({ path: '/chat', query: { conv_id: String(conversationId) } })
      return
    }
    await router.push({
      path: '/chat',
      query: {
        target_user_id: String(targetUserId),
        title: userInfo.value.nickname || '未知用户',
        cover_url: userInfo.value.avatar_url || ''
      }
    })
  } catch (error) {
    ElMessage.error('发起私信失败')
  }
}

const handleTabChange = (tab: string) => {
  activeTab.value = tab
  fetchTabContent()
}

watch(() => route.query.id, (newId) => {
  if (newId) {
    activeTab.value = 'works'
    fetchProfileData()
    fetchTabContent()
  }
})

onMounted(() => {
  if (!currentUserId.value) {
    router.replace('/')
    return
  }
  fetchProfileData()
  fetchTabContent()
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
                <button class="action-btn edit-btn" @click="router.push('/settings/profile')">编辑资料</button>
              </template>
              <template v-else>
                <button class="action-btn follow-btn" :class="{ 'is-following': isFollowing }" @click="handleFollow">
                  <span v-if="isFollowing">已关注</span>
                  <span v-else>+ 关注</span>
                </button>
                <button class="action-btn chat-btn" @click="handleChatClick">私信</button>
              </template>
            </div>
          </div>
        </div>

        <div class="header-right">
          <div class="stat-box" :class="{ 'clickable': isMe }" @click="handleStatClick('following')">
            <div class="stat-num">{{ stats.following }}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="divider-v"></div>
          <div class="stat-box" :class="{ 'clickable': isMe }" @click="handleStatClick('followers')">
            <div class="stat-num">{{ stats.followers }}</div>
            <div class="stat-label">粉丝</div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="tabs-header">
          <transition name="slide-fade">
            <div v-if="isRelationView" class="back-pill" @click="handleTabChange('works')">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              <span>返回动态</span>
            </div>
          </transition>

          <template v-if="isRelationView">
            <div class="tab-item" :class="{ active: activeTab === 'following' }" @click="handleTabChange('following')">
              关注
            </div>
            <div class="tab-item" :class="{ active: activeTab === 'followers' }" @click="handleTabChange('followers')">
              粉丝
            </div>
          </template>

          <template v-else>
            <div class="tab-item" :class="{ active: activeTab === 'works' }" @click="handleTabChange('works')">动态
            </div>
            <div class="tab-item" :class="{ active: activeTab === 'likes' }" @click="handleTabChange('likes')">喜欢
            </div>
            <div class="tab-item" :class="{ active: activeTab === 'collects' }" @click="handleTabChange('collects')">
              收藏
            </div>
          </template>
        </div>

        <div class="main-content-wrapper">
          <div v-if="loadingContent" class="loading-state">
            <div class="spinner"></div>
          </div>

          <template v-else>
            <div v-if="isRelationView">
              <UserGrid :users="relationUsers" :loading="false"/>
              <div v-if="relationUsers.length === 0" class="empty-state">暂无相关用户</div>
            </div>
            <div v-else>
              <PostGrid :posts="posts" :loading="false" @post-click="handlePostClick"/>
              <div v-if="posts.length === 0" class="empty-state">暂无相关内容</div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <PostDetail v-model="showPostDetail" :postId="selectedPostId"/>
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

/* 头部卡片风格同步 */
.profile-header-card {
  background: #fff;
  border-radius: 24px;
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

/* 按钮样式 */
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

.follow-btn.is-following {
  background: #E3E5E7;
  color: #9499A0;
}

.chat-btn, .edit-btn {
  background: #fff;
  border: 1px solid #E3E5E7;
  color: #61666D;
}

/* 头部数据统计 */
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
  transition: all 0.2s;
}

.stat-box.clickable {
  cursor: pointer;
  border-radius: 12px;
  padding: 8px 24px;
}

.stat-box.clickable:hover {
  background-color: #F4F6F8;
}

.stat-box.clickable:hover .stat-num {
  color: #00AEEC;
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

/* 内容区块 */
.content-section {
  background: #fff;
  border-radius: 24px;
  min-height: 600px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

/* 标签栏 & 返回按钮样式 */
.tabs-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #F0F2F5;
  padding: 0 32px;
  height: 60px;
}

.back-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #F4F6F8;
  color: #61666D;
  border-radius: 30px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  margin-right: 20px;
  transition: all 0.2s;
}

.back-pill:hover {
  background: #E3E5E7;
  color: #18191C;
}

.tab-item {
  padding: 18px 0;
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
  font-weight: 700;
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

.main-content-wrapper {
  padding: 24px 32px;
}

.empty-state {
  text-align: center;
  color: #9499A0;
  padding: 100px 0;
  font-size: 14px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #00AEEC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 60px auto;
}

/* 动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
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
