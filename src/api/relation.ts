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

// 获取用户粉丝列表
export function getFollowersApi(params: RelationPageParams) {
  return request({
    url: '/user-relation/followers',
    method: 'get',
    params
  })
}

// 获取用户粉丝数量
export function getFollowersCountApi() {
  return request({
    url: '/user-relation/followers/count',
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
export function getFollowingsCountApi() {
  return request({
    url: '/user-relation/followings/count',
    method: 'get'
  })
}

// 获取用户是否关注某个用户
export function checkIsFollowApi(followingId: number | string) {
  return request({
    url: `/user-relation/isFollow/${followingId}`,
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
