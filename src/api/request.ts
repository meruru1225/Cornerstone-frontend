import axios from 'axios'

const service = axios.create({
  baseURL: '/api', // 使用 Proxy 代理
  timeout: 10000,
  withCredentials: true // 允许跨域携带 Cookie
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 不需要手动添加 Authorization Header，Cookie 会自动携带
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 如果后端返回 code 字段，且不为 200，则视为错误
    if (res.code !== undefined && res.code !== 200) {
      if (res.code === 401) {
        // 401 未授权，仅抛出错误，交给调用方处理（如切换为游客模式）
        // 不再强制跳转登录页
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    // 兼容部分可能直接返回数据的接口，或者只返回 code=200 的情况
    return res
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // 401 未授权，仅抛出错误
    }
    return Promise.reject(error)
  }
)

export default service
