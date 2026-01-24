import request from './request'

export interface CurrentUserInfo {
  user_id: number
  username: string
  phone: string
  nickname: string
  avatar_url: string
  bio: string
  gender: number
  region: string
  birthday: string
  created_at: string
}

export interface UserHomeInfo {
  user_id: number
  nickname: string
  avatar_url: string
  bio: string
  gender: number
  region: string
}

export interface UserSimpleInfo {
  user_id: number
  nickname: string
  avatar_url: string
  bio: string
}

export interface UpdateUserInfoParams {
  nickname?: string
  bio?: string
  gender?: number
  birthday?: string
  region?: string
}

export interface ChangePasswordParams {
  old_password?: string
  new_password?: string
}

export interface ChangeUsernameParams {
  username: string
}

export interface ChangePhoneParams {
  token: string
  new_phone: string
}

export interface UserConditionParams {
  id?: string
  username?: string
  phone?: string
  nickname?: string
  page?: number
  page_size?: number
}

export interface UserRoleParams {
  user_id: number
  role_id: number
}

export interface AdminUserDetail {
  user_id: number
  nickname: string
  avatar_url: string
  bio: string
  gender: number
  region: string
  birthday: string
}

export interface AdminUserRole {
  user_id: number
  role_id: number
}

export interface AdminUserItem {
  id: number
  username: string
  phone: string | null
  password?: string | null
  is_ban: boolean
  is_delete: boolean
  created_at: string
  updated_at: string
  user_detail: AdminUserDetail
  user_roles: AdminUserRole[]
}

export interface RoleItem {
  ID: number
  Name: string
  Description: string
}

// 获取当前登录用户信息
export function getUserInfoApi() {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

// 获取当前登录用户角色
export function getUserRolesApi() {
  return request({
    url: '/user/roles',
    method: 'get'
  })
}

// 获取指定用户主页信息
export function getUserHomeApi(userId: number | string) {
  return request({
    url: `/user/${userId}/home`,
    method: 'get'
  })
}

// 获取指定用户简洁信息
export function getUserSimpleApi(userId: number | string) {
  return request({
    url: `/user/${userId}/simple`,
    method: 'get'
  })
}

// 批量获取用户简洁信息
export function batchGetUserSimpleApi(userIds: number[]) {
  return request({
    url: '/user/batch/simple',
    method: 'get',
    params: {
      user_ids: JSON.stringify(userIds)
    }
  })
}

// 搜索用户
export function searchUserApi(keyword: string) {
  return request({
    url: '/user/search',
    method: 'get',
    params: { keyword }
  })
}

// 更新用户信息
export function updateUserInfoApi(data: UpdateUserInfoParams) {
  return request({
    url: '/user/info',
    method: 'put',
    data
  })
}

// 更改密码
export function changePasswordApi(data: ChangePasswordParams) {
  return request({
    url: '/user/password',
    method: 'put',
    data
  })
}

// 更改用户名
export function changeUsernameApi(data: ChangeUsernameParams) {
  return request({
    url: '/user/username',
    method: 'put',
    data
  })
}

// 改绑手机
export function changePhoneApi(data: ChangePhoneParams) {
  return request({
    url: '/user/phone',
    method: 'put',
    data
  })
}

// 上传头像
export function uploadAvatarApi(data: FormData) {
  return request({
    url: '/user/avatar',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 注销用户
export function cancelAccountApi() {
  return request({
    url: '/user/cancel',
    method: 'post'
  })
}

// --- 管理员接口 ---

// 封禁用户
export function banUserApi(userId: number) {
  return request({
    url: '/user/ban',
    method: 'post',
    data: { user_id: userId }
  })
}

// 解禁用户
export function unbanUserApi(userId: number) {
  return request({
    url: '/user/unban',
    method: 'post',
    data: { user_id: userId }
  })
}

// 根据条件查询用户
export function queryUserByConditionApi(params: UserConditionParams) {
  return request({
    url: '/user/condition',
    method: 'get',
    params
  })
}

// 获取所有角色
export function getAllRolesApi() {
  return request({
    url: '/user/roles/all',
    method: 'get'
  })
}

// 为用户添加角色
export function addUserRoleApi(data: UserRoleParams) {
  return request({
    url: '/user/role',
    method: 'post',
    data
  })
}

// 为用户删除角色
export function deleteUserRoleApi(data: UserRoleParams) {
  return request({
    url: '/user/role',
    method: 'delete',
    data
  })
}
