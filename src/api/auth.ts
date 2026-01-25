import request from './request'

export interface LoginParams {
  account: string
  password: string
  remember?: boolean
}

export interface PhoneLoginParams {
  phone: string
  code: string
  remember?: boolean
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

export interface RegisterByPhoneParams {
  phone: string
  phone_token: string
  nickname: string
  gender: number
  birthday: string
  region?: string
  bio?: string
  remember?: boolean
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

// 登出
export function logoutApi() {
  return request({
    url: '/user/logout',
    method: 'post'
  })
}

// 注册
export function registerApi(data: RegisterParams) {
  return request({
    url: '/user/register',
    method: 'post',
    data
  })
}

// 手机号注册
export function registerByPhoneApi(data: RegisterByPhoneParams) {
  return request({
    url: '/user/register/phone',
    method: 'post',
    data
  })
}

// 发送验证码
export function sendCodeApi(phone: string) {
  return request({
    url: '/user/sms/send',
    method: 'post',
    data: { phone }
  })
}

// 忘记密码
export function forgetPasswordApi(data: ForgetPasswordParams) {
  return request({
    url: '/user/password/forget',
    method: 'put',
    data
  })
}
