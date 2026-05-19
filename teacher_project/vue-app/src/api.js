/**
 * API 请求封装
 * - 开发环境：通过 vue.config.js proxy 代理到 localhost:5000
 * - 生产环境：通过 VUE_APP_API_URL 环境变量指定后端地址
 */
import axios from 'axios'

// 生产环境 API 基础地址（从环境变量读取）
const API_BASE_URL = process.env.VUE_APP_API_URL || ''

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动附带 token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理错误
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // token 过期，清除登录状态
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

export default apiClient
