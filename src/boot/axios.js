import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { LocalStorage } from 'quasar'

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3000/api'
})

// Request interceptor: Inject Bearer token
api.interceptors.request.use(
  (config) => {
    const token = LocalStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
