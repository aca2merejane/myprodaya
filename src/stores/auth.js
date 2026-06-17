import { defineStore } from 'pinia'
import { api } from 'boot/axios'
import { LocalStorage, Notify } from 'quasar'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.priv_admin === 'Y',
    userOffice: (state) => state.user?.office || '',
    hasAccess: (state) => (moduleName) => {
      if (state.user?.priv_admin === 'Y') return true
      return state.user?.modules?.[moduleName]?.access || false
    },
    can: (state) => (moduleName, action) => {
      if (state.user?.priv_admin === 'Y') return true
      const modulePerms = state.user?.modules?.[moduleName]
      if (!modulePerms) return false
      if (action === 'create' || action === 'insert') return !!modulePerms.insert
      if (action === 'edit' || action === 'update') return !!modulePerms.update
      if (action === 'delete') return !!modulePerms.delete
      return false
    }
  },

  actions: {
    initialize() {
      const storedToken = LocalStorage.getItem('token')
      const storedUser = LocalStorage.getItem('user')
      if (storedToken && storedUser) {
        this.token = storedToken
        this.user = storedUser
      }
    },

    async login(username, password) {
      try {
        const response = await api.post('/auth/login', { username, password })
        const { token, user } = response.data
        
        this.token = token
        this.user = user

        LocalStorage.set('token', token)
        LocalStorage.set('user', user)

        Notify.create({
          type: 'positive',
          message: `Selamat datang kembali, ${user.name || 'User'}!`
        })
        return true
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Login gagal. Silakan coba lagi.'
        Notify.create({
          type: 'negative',
          message: errorMsg
        })
        return false
      }
    },

    async loginWithGoogle(idToken, email = null) {
      try {
        const response = await api.post('/auth/google-login', { idToken, email })
        const { token, user } = response.data

        this.token = token
        this.user = user

        LocalStorage.set('token', token)
        LocalStorage.set('user', user)

        Notify.create({
          type: 'positive',
          message: `Login Google Berhasil! Selamat datang, ${user.name || 'User'}!`
        })
        return true
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Login Google gagal.'
        Notify.create({
          type: 'negative',
          message: errorMsg
        })
        return false
      }
    },

    logout() {
      this.token = null
      this.user = null
      LocalStorage.remove('token')
      LocalStorage.remove('user')
      Notify.create({
        type: 'info',
        message: 'Anda telah keluar dari aplikasi.'
      })
    }
  }
})
