import request from './request'
import type { PostMediaPayload } from './post'

// 评论媒体信息接口
export interface CommentMediaItem {
  mime_type: string
  url: string
  width?: number
  height?: number
  duration?: number
  cover_url?: string
}

// 评论信息接口
export interface CommentItem {
  id: number
  post_id: number
  user_id: number
  nickname: string
  avatar_url: string
  content: string
  media_info?: CommentMediaItem[]
  root_id: number
  parent_id: number
  reply_to_user_id: number
  reply_to_nickname: string
  likes_count: number
  created_at: string
  sub_comments?: CommentItem[] | null
  sub_comment_count: number
}

// 帖子互动状态接口
export interface PostActionState {
  like_count: number
  collect_count: number
  comment_count: number
  view_count: number
  is_liked: boolean
  is_collected: boolean
}

// 批量获取点赞状态返回接口
export interface BatchLikeItem {
  like_count: number
  is_liked: boolean
}

// 分页参数
export interface PageParams {
  page?: number
  page_size?: number
}

// 创建评论参数
export interface CreateCommentParams {
  post_id: number | string
  parent_id?: number | string // 0 for root comment
  content: string
  media_info?: PostMediaPayload[] // 使用 Post 模块中定义的提交结构
}

// 举报参数
export interface ReportPostParams {
  post_id: number | string
  reason: string
}

// 互动操作动作
export const ActionType = {
  ADD: 1,
  CANCEL: 2
} as const

export type ActionType = (typeof ActionType)[keyof typeof ActionType]

/**
 * 获取帖子评论列表
 * @param postId 帖子ID
 * @param params 分页参数
 */
export function getPostCommentsApi(postId: number | string, params: PageParams) {
  return request({
    url: `/post/action/comments/${postId}`,
    method: 'get',
    params
  })
}

/**
 * 获取子评论列表
 * @param rootId 根评论ID
 * @param params 分页参数
 */
export function getSubCommentsApi(rootId: number | string, params: PageParams) {
  return request({
    url: `/post/action/sub-comments/${rootId}`,
    method: 'get',
    params
  })
}

/**
 * 批量获取帖子点赞状态
 * @param postIds 帖子ID数组
 */
export function getBatchLikesApi(postIds: number[]) {
  return request<{ data: BatchLikeItem[] }>({ // 对应 OpenAPI 中的 array 返回
    url: '/post/action/batch/likes',
    method: 'post',
    data: { post_ids: postIds }
  })
}

/**
 * 帖子点赞/取消点赞
 * @param postId 帖子ID
 * @param action 1:点赞, 2:取消
 */
export function likePostApi(postId: number | string, action: ActionType) {
  return request({
    url: `/post/action/likes/${postId}`,
    method: 'post',
    data: { action }
  })
}

/**
 * 帖子收藏/取消收藏
 * @param postId 帖子ID
 * @param action 1:收藏, 2:取消
 */
export function collectPostApi(postId: number | string, action: ActionType) {
  return request({
    url: `/post/action/collects/${postId}`,
    method: 'post',
    data: { action }
  })
}

/**
 * 获取帖子各项互动数据并上报浏览
 * @param postId 帖子ID
 */
export function getPostActionStateApi(postId: number | string, needTrack: boolean = true) {
  return request({
    url: '/post/action/state',
    method: 'get',
    params: {
      post_id: postId,
      need_track: needTrack
    }
  })
}

/**
 * 创建评论
 * @param data 评论数据
 */
export function createCommentApi(data: CreateCommentParams) {
  return request({
    url: '/post/action/comments',
    method: 'post',
    data
  })
}

/**
 * 删除评论
 * @param commentId 评论ID
 */
export function deleteCommentApi(commentId: number | string) {
  return request({
    url: `/post/action/comments/${commentId}`,
    method: 'delete'
  })
}

/**
 * 评论点赞/取消点赞
 * @param commentId 评论ID
 * @param action 1:点赞, 2:取消
 */
export function likeCommentApi(commentId: number | string, action: ActionType) {
  return request({
    url: `/post/action/comments/${commentId}/like`,
    method: 'post',
    data: { action }
  })
}

/**
 * 获取用户的喜欢列表
 * @param userId 用户ID (0或空查自己)
 */
export function getLikedPostsApi(userId: number | string = 0) {
  return request({
    url: '/post/action/liked',
    method: 'get',
    params: { user_id: userId }
  })
}

/**
 * 获取用户的收藏列表
 * @param userId 用户ID (0或空查自己)
 */
export function getCollectedPostsApi(userId: number | string = 0) {
  return request({
    url: '/post/action/collections',
    method: 'get',
    params: { user_id: userId }
  })
}

/**
 * 举报帖子
 * @param data 举报参数
 */
export function reportPostApi(data: ReportPostParams) {
  return request({
    url: `/post/action/reports/${data.post_id}`,
    method: 'post',
    data: { reason: data.reason }
  })
}
