import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  Router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    authStore.initialize() // Load session from local storage

    // Check if target route requires authentication
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
    // The login route explicitly has meta: { requiresAuth: false }

    if (to.path === '/login') {
      if (authStore.isAuthenticated) {
        return next('/')
      }
      return next()
    }

    if (requiresAuth && !authStore.isAuthenticated) {
      return next('/login')
    }

    // Check if route requires administrator role
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
    if (requiresAdmin && !authStore.isAdmin) {
      Notify.create({
        type: 'negative',
        message: 'Akses ditolak. Menu ini hanya terbuka untuk Administrator.'
      })
      return next('/')
    }

    // Check module permission if defined
    const targetModule = to.matched.find(record => record.meta.module)?.meta.module
    if (targetModule && !authStore.hasAccess(targetModule)) {
      Notify.create({
        type: 'negative',
        message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses modul ini.'
      })
      return next('/')
    }

    next()
  })

  return Router
})
