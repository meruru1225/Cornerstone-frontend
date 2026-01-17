import request from './request'

// 消息 Payload 接口
export interface SysboxMsgPayload {
  post_title: string
}

// 收件箱消息项接口
export interface SysboxMsgItem {
  id: string
  senderId: number
  senderName: string
  avatarUrl: string
  type: number // 1:点赞帖子, 5:关注用户 等
  targetId: number
  content: string
  payload: SysboxMsgPayload | null
  isRead: boolean
  createdAt: string
}

// 未读数量返回接口
export interface UnreadCountResult {
  unreadCount: number
}

// 分页参数
export interface PageParams {
  page?: number
  page_size?: number
}

/**
 * 获取收件箱信息
 * @param params 分页参数
 */
export function getSysboxListApi(params: PageParams) {
  return request({
    url: '/sysbox/list',
    method: 'get',
    params
  })
}

/**
 * 获取收件箱未读数量
 */
export function getUnreadCountApi() {
  return request({
    url: '/sysbox/unread',
    method: 'get'
  })
}

/**
 * 标记收件箱信息已读
 * @param msgId 消息ID
 */
export function markReadApi(msgId: string) {
  return request({
    url: '/sysbox/read',
    method: 'post',
    data: { msg_id: msgId }
  })
}

/**
 * 标记收件箱信息全部已读
 */
export function markAllReadApi() {
  return request({
    url: '/sysbox/read/all',
    method: 'post'
  })
}
