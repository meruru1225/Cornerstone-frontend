import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginByPasswordApi, loginByPhoneApi, logoutApi } from '../api/auth'
import { getUserInfoApi, getUserRolesApi, type CurrentUserInfo } from '../api/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<CurrentUserInfo | null>(null)
  const isLoggedIn = ref(false)
  const roles = ref<string[]>([])
  // userId 可以从 userInfo.user_id 获取，或者单独存，这里我们主要依赖 userInfo
  
  // 统一登录入口，根据 method 分发
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
        await loginByPhoneApi({
          phone: payload.account || '',
          code: payload.smsCode || '',
          remember: payload.remember
        })
      }

      // 登录成功后获取用户信息
      await fetchUserInfo()
      await fetchUserRoles()
      
      isLoggedIn.value = true
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
      console.warn('获取用户信息失败，已降级为游客模式', error)
      userInfo.value = null
      isLoggedIn.value = false
    }
  }

  const fetchUserRoles = async () => {
     try {
       const res: any = await getUserRolesApi()
       roles.value = res.data || []
     } catch (error) {
       console.warn('获取用户角色失败', error)
       roles.value = []
     }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (error) {
      console.warn('登出接口调用失败', error)
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
    fetchUserInfo,
    fetchUserRoles,
    logout
  }
})
