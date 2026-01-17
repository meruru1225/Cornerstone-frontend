import request from './request'

export interface LoginParams {
  account: string
  password: string
}

export interface PhoneLoginParams {
  phone: string
  code: string
}

export interface RegisterParams {
  username?: string
  password?: string
  nickname?: string
  bio?: string
  gender?: number
  region?: string
  birthday?: string // YYYY-MM-DD
}

export interface ForgetPasswordParams {
  phone: string
  sms_code: string
  new_password: string
}

export interface UserInfo {
  user_id: number
  nickname: string
  avatar_url: string
  bio: string
  gender: number
  region: string
  birthday: string
  created_at: string
}

// 账号密码登录
export function loginByPasswordApi(data: LoginParams) {
  return request({
    url: '/user/login',
    method: 'post',
    data
  })
}

// 手机验证码登录
export function loginByPhoneApi(data: PhoneLoginParams) {
  return request({
    url: '/user/login/phone',
    method: 'post',
    data
  })
}

export function logoutApi() {
  return request({
    url: '/user/logout',
    method: 'post'
  })
}

export function registerApi(data: RegisterParams) {
  return request({
    url: '/user/register',
    method: 'post',
    data
  })
}

// 发送验证码接口
export function sendCodeApi(phone: string) {
  return request({
    url: '/user/sms/send',
    method: 'post',
    data: { phone }
  })
}

export function forgetPasswordApi(data: ForgetPasswordParams) {
  return request({
    url: '/user/password/forget',
    method: 'put',
    data
  })
}
