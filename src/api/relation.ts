import request from './request'

export interface RelationItem {
  followerId: number
  followingId: number
  createdAt: string
}

export interface RelationPageParams {
  page?: number
  page_size?: number
}

export interface CountResponse {
  count: number
}

// 获取用户粉丝列表
export function getFollowersApi(params: RelationPageParams) {
  return request({
    url: '/user-relation/followers',
    method: 'get',
    params
  })
}

// 获取用户粉丝数量
// 如果传入 userId，则获取该用户的粉丝数量；否则获取当前登录用户的粉丝数量
export function getFollowersCountApi(userId?: number | string) {
  const url = userId 
    ? `/user-relation/followers/count/${userId}`
    : '/user-relation/followers/count'
    
  return request<CountResponse>({
    url,
    method: 'get'
  })
}

// 获取用户关注列表
export function getFollowingsApi(params: RelationPageParams) {
  return request({
    url: '/user-relation/followings',
    method: 'get',
    params
  })
}

// 获取用户关注数量
// 如果传入 userId，则获取该用户的关注数量；否则获取当前登录用户的关注数量
export function getFollowingsCountApi(userId?: number | string) {
  const url = userId
    ? `/user-relation/followings/count/${userId}`
    : '/user-relation/followings/count'

  return request<CountResponse>({
    url,
    method: 'get'
  })
}

// 获取用户是否关注某个用户
export function checkIsFollowApi(followingId: number | string) {
  return request<boolean>({
    url: `/user-relation/isfollow/${followingId}`,
    method: 'get'
  })
}

// 关注用户
export function followUserApi(followingId: number | string) {
  return request({
    url: `/user-relation/follow/${followingId}`,
    method: 'post'
  })
}

// 取消关注用户
export function unfollowUserApi(followingId: number | string) {
  return request({
    url: `/user-relation/follow/${followingId}`,
    method: 'delete'
  })
}
