import request from './request'

export interface MetricItem {
  date: string
  value: number
}

/**
 * 用户指标7日数据
 */
export function getUserMetric7d() {
  return request({
    url: '/metrics/user/7d',
    method: 'get'
  })
}

/**
 * 用户指标30日数据
 */
export function getUserMetric30d() {
  return request({
    url: '/metrics/user/30d',
    method: 'get'
  })
}

/**
 * 内容指标7日数据（用户维度）
 */
export function getUserContentMetric7d() {
  return request({
    url: '/metrics/user-content/7d',
    method: 'get'
  })
}

/**
 * 内容指标30日数据（用户维度）
 */
export function getUserContentMetric30d() {
  return request({
    url: '/metrics/user-content/30d',
    method: 'get'
  })
}

/**
 * 内容指标7日指标（帖子维度）
 * @param postId 帖子ID
 */
export function getPostMetric7d(postId: number | string) {
  return request({
    url: `/metrics/post/7d/${postId}`,
    method: 'get'
  })
}

/**
 * 内容指标30日指标（帖子维度）
 * @param postId 帖子ID
 */
export function getPostMetric30d(postId: number | string) {
  return request({
    url: `/metrics/post/30d/${postId}`,
    method: 'get'
  })
}
