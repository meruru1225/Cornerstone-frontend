import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginByPasswordApi, loginByPhoneApi, logoutApi } from '../api/auth'
import { getUserInfoApi, getUserRolesApi, type CurrentUserInfo } from '../api/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<CurrentUserInfo | null>(null)
  const isLoggedIn = ref(false)
  const roles = ref<string[]>([])

  // 统一刷新用户状态
  const refreshUser = async () => {
    try {
      await fetchUserInfo()
      await fetchUserRoles()
      if (userInfo.value) {
        isLoggedIn.value = true
      }
    } catch (error) {
      console.warn('刷新用户状态失败', error)
      userInfo.value = null
      isLoggedIn.value = false
      throw error
    }
  }

  // 登录逻辑
  const login = async (payload: { account?: string, password?: string, smsCode?: string, method: 'password' | 'sms', remember?: boolean }) => {
    try {
      if (payload.method === 'password') {
        await loginByPasswordApi({
          account: payload.account || '',
          password: payload.password || '',
          remember: payload.remember
        })
      } else {
        // 短信登录
        const res: any = await loginByPhoneApi({
          phone: payload.account || '',
          code: payload.smsCode || '',
          remember: payload.remember
        })

        // 如果 is_reg 为 false，说明未注册
        const data = res.data || res
        if (data && typeof data.is_reg === 'boolean' && !data.is_reg) {
          return {
            needRegister: true,
            token: data.token,
            phone: payload.account,
            remember: payload.remember // [修复]：透传记住我状态
          }
        }
      }

      // 正常登录成功，刷新状态
      await refreshUser()
      return { needRegister: false }
    } catch (error) {
      throw error
    }
  }

  const fetchUserInfo = async () => {
    try {
      const res: any = await getUserInfoApi()
      userInfo.value = res.data || null
      isLoggedIn.value = true
    } catch (error) {
      userInfo.value = null
      isLoggedIn.value = false
      throw error
    }
  }

  const fetchUserRoles = async () => {
    try {
      const res: any = await getUserRolesApi()
      roles.value = res.data || []
    } catch (error) {
      roles.value = []
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (error) {
      console.warn('登出失败', error)
    } finally {
      // 无论接口是否成功，前端都要清除状态
      userInfo.value = null
      roles.value = []
      isLoggedIn.value = false
    }
  }

  return {
    userInfo,
    isLoggedIn,
    roles,
    login,
    refreshUser,
    fetchUserInfo,
    fetchUserRoles,
    logout
  }
})