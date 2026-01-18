import request from './request'

// 媒体资源接口
export interface MediaItem {
  mime_type?: string
  url: string
  width?: number
  height?: number
  duration?: number
  cover_url?: string
}

// 提交时的媒体资源接口 (兼容后端文档中的 typo: mime_typpe)
export interface PostMediaPayload {
  mime_type?: string
  url: string
  width?: number
  height?: number
  duration?: number
  cover_url?: string
}

// 帖子信息接口
export interface PostItem {
  id: number
  title: string
  content: string
  status: number // 1: 正常, 2: 待审核
  created_at: string
  updated_at: string
  medias: MediaItem[]
  user_id: number
  nickname: string
  avatar_url: string
  like_count?: number
  collect_count?: number
  view_count?: number
  comment_count?: number
  is_liked?: boolean
  is_collected?: boolean
}

// 分页参数接口
export interface PageParams {
  page?: number
  page_size?: number
}

// 标签搜索参数
export interface TagSearchParams extends PageParams {
  tag?: string
  is_main?: boolean
}

// 创建帖子参数
export interface CreatePostParams {
  title: string
  content: string
  medias: PostMediaPayload[]
}

// 更新帖子参数
export interface UpdatePostParams {
  id: number | string
  title: string
  content: string
  medias: PostMediaPayload[]
}

// 审批帖子参数
export interface AuditPostParams {
  post_id: number | string
  status: number
}

/**
 * 获取推荐流帖子
 */
export function getRecommendPostsApi() {
  return request({
    url: '/posts/recommend',
    method: 'get'
  })
}

/**
 * 搜索帖子
 * @param keyword 关键词
 */
export function searchPostsApi(keyword: string) {
  return request({
    url: '/posts/search',
    method: 'get',
    params: { keyword }
  })
}

/**
 * 获取帖子详情
 * @param postId 帖子ID
 */
export function getPostDetailApi(postId: number | string) {
  return request({
    url: `/posts/detail/${postId}`,
    method: 'get'
  })
}

/**
 * 获取指定用户的帖子列表
 * @param userId 用户ID
 * @param params 分页参数
 */
export function getUserPostsApi(userId: number | string, params: PageParams) {
  return request({
    url: `/posts/list/${userId}`,
    method: 'get',
    params
  })
}

/**
 * 获取我的帖子列表
 */
export function getMyPostsApi() {
  return request({
    url: '/posts/self',
    method: 'get'
  })
}

/**
 * 获取某个标签的帖子
 * @param params 查询参数
 */
export function getPostsByTagApi(params: TagSearchParams) {
  return request({
    url: '/posts/tags',
    method: 'get',
    params
  })
}

/**
 * 创建帖子
 * @param data 帖子数据
 */
export function createPostApi(data: CreatePostParams) {
  return request({
    url: '/posts',
    method: 'post',
    data
  })
}

/**
 * 修改帖子
 * @param data 帖子数据（需包含id）
 */
export function updatePostApi(data: UpdatePostParams) {
  const { id, ...rest } = data
  return request({
    url: `/posts/${id}`,
    method: 'put',
    data: rest
  })
}

/**
 * 删除帖子
 * @param postId 帖子ID
 */
export function deletePostApi(postId: number | string) {
  return request({
    url: `/posts/${postId}`,
    method: 'delete'
  })
}

/**
 * 获取待审批列表（管理员/审核员）
 */
export function getAuditListApi() {
  return request({
    url: '/posts/audit/list',
    method: 'get'
  })
}

/**
 * 审批帖子状态（管理员/审核员）
 * @param data 审批参数
 */
export function auditPostApi(data: AuditPostParams) {
  return request({
    url: `/posts/audit/${data.post_id}/status`,
    method: 'put',
    data: {
      status: data.status
    }
  })
}
