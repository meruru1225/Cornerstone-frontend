<script setup lang="ts">
import {ref, onMounted, onUnmounted, watch, nextTick} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import PostGrid from '../components/PostGrid.vue'
import PostDetail from '../components/PostDetail.vue'
import {searchPostsApi, type PostItem} from '../api/post'
import {searchAgentApi} from '../api/agent'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, {language: lang}).value}</code></pre>`
      } catch (__) {
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const posts = ref<PostItem[]>([])
const loadingPosts = ref(false)

const agentOutput = ref('')
const isAgentThinking = ref(false)
const agentAbortController = ref<AbortController | null>(null)
// 新增：用于自动滚动的 ref
const agentScrollBody = ref<HTMLElement | null>(null)

const isDetailVisible = ref(false)
const currentPostId = ref<number | null>(null)

const handleSearch = () => {
  const query = keyword.value.trim()
  if (!query) return
  router.replace({query: {q: query}})
}

const performSearch = (query: string) => {
  posts.value = []
  agentOutput.value = ''

  if (agentAbortController.value) {
    agentAbortController.value.abort()
  }
  agentAbortController.value = new AbortController()

  fetchPosts(query)
  fetchAgentSummary(query, agentAbortController.value.signal)
}

const fetchPosts = async (query: string) => {
  loadingPosts.value = true
  try {
    const res: any = await searchPostsApi(query)
    posts.value = res.data?.list || res.list || []
  } catch (error) {
    console.error('搜索帖子失败', error)
  } finally {
    loadingPosts.value = false
  }
}

// 修复核心：数据解析逻辑优化
const fetchAgentSummary = async (query: string, signal: AbortSignal) => {
  isAgentThinking.value = true
  try {
    await searchAgentApi(
        {query},
        {
          onMessage: async (data) => {
            try {
              // 严格解析：必须是 JSON 格式且包含有效内容
              const parsed = JSON.parse(data)

              // 只有当 type 是 message 且 content 有值时才拼接
              if (parsed.type === 'message' && parsed.content) {
                let content = parsed.content
                if (content === '\\n') content = '\n'
                agentOutput.value += content

                // 自动滚动到底部
                await nextTick()
                if (agentScrollBody.value) {
                  agentScrollBody.value.scrollTo({
                    top: agentScrollBody.value.scrollHeight,
                    behavior: 'smooth'
                  })
                }
              }
            } catch (e) {
              // 解析失败忽略，绝不回退使用 raw data
            }
          },
          onFinish: () => {
            isAgentThinking.value = false
          },
          onError: () => {
            isAgentThinking.value = false
            if (!agentOutput.value) agentOutput.value = '智能引擎暂时繁忙，请稍后重试。'
          }
        },
        signal
    )
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      isAgentThinking.value = false
    }
  }
}

const handlePostClick = (id: number) => {
  currentPostId.value = id
  isDetailVisible.value = true
}

onMounted(() => {
  const q = route.query.q as string
  if (q) {
    keyword.value = q
    performSearch(q)
  }
})

watch(() => route.query.q, (newQ) => {
  if (newQ) {
    keyword.value = newQ as string
    performSearch(newQ as string)
  }
})

onUnmounted(() => {
  if (agentAbortController.value) agentAbortController.value.abort()
})
</script>

<template>
  <div class="search-view">
    <header class="sticky-header">
      <div class="g-search-container">
        <div class="g-search-capsule">
          <input
              type="text"
              v-model="keyword"
              placeholder="搜索灵感、用户或内容..."
              @keyup.enter="handleSearch"
          />
          <button class="g-search-btn" @click="handleSearch">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="search-content">
      <transition name="slide-fade">
        <div v-if="agentOutput || isAgentThinking" class="agent-section">
          <div class="agent-header">
            <div class="ai-icon">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span>灵感 AI 综述</span>
            </div>
            <span v-if="isAgentThinking" class="typing-indicator">生成中...</span>
          </div>

          <div class="agent-scroll-box" ref="agentScrollBody">
            <div class="agent-body markdown-body" v-html="md.render(agentOutput)"></div>
          </div>
        </div>
      </transition>

      <div class="results-section">
        <div v-if="loadingPosts" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="posts.length > 0">
          <h3 class="section-title">相关发现</h3>
          <PostGrid :posts="posts" @post-click="handlePostClick"/>
        </div>

        <div v-else-if="!loadingPosts && keyword" class="empty-state">
          <img src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" alt="empty"/>
          <p>没有找到相关内容，试试其他关键词？</p>
        </div>
      </div>
    </div>

    <PostDetail v-model="isDetailVisible" :postId="currentPostId"/>
  </div>
</template>

<style scoped>
.search-view {
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

.search-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Agent 区域样式 */
.agent-section {
  background: linear-gradient(135deg, #f0faff 0%, #f7f9fc 100%);
  border-radius: 16px;
  padding: 20px 20px 10px 20px; /* 底部padding减小，留给滚动区域 */
  margin-bottom: 30px;
  border: 1px solid #e3f2fd;
  box-shadow: 0 4px 20px rgba(0, 174, 236, 0.05);
  /* 防止布局跳动，可以设置最小高度，但主要靠内部 scroll-box 固定 */
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 174, 236, 0.1);
}

/* 修复：固定高度的滚动容器 */
.agent-scroll-box {
  height: 280px; /* 固定高度 */
  overflow-y: auto; /* 允许纵向滚动 */
  padding-right: 10px; /* 防止文字紧贴滚动条 */

  /* 美化滚动条 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #00AEEC #f0faff;
}

/* Chrome/Safari 滚动条样式 */
.agent-scroll-box::-webkit-scrollbar {
  width: 6px;
}

.agent-scroll-box::-webkit-scrollbar-track {
  background: transparent;
}

.agent-scroll-box::-webkit-scrollbar-thumb {
  background-color: #A0DFFE;
  border-radius: 3px;
}

.agent-scroll-box::-webkit-scrollbar-thumb:hover {
  background-color: #00AEEC;
}

.ai-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #00AEEC;
  font-weight: 700;
  font-size: 14px;
}

.typing-indicator {
  font-size: 12px;
  color: #9499A0;
  animation: pulse 1.5s infinite;
}

.agent-body {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
}

/* 结果区样式 */
.section-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #18191C;
  padding-left: 4px;
}

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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>