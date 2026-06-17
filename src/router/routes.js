const routes = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('pages/DonationDashboard.vue'), meta: { module: 'dashboard' } },
      { path: 'qurban-dashboard', component: () => import('pages/QurbanDashboard.vue'), meta: { module: 'qurban-dashboard' } },
      { path: 'mustahik', component: () => import('pages/MustahikPage.vue'), meta: { module: 'mustahik' } },
      { path: 'penyaluran', component: () => import('pages/PenyaluranPage.vue'), meta: { module: 'penyaluran' } },
      { path: 'verifikasi-penyaluran', component: () => import('pages/VerifikasiPage.vue'), meta: { module: 'verifikasi-penyaluran' } },
      { path: 'qurban', component: () => import('pages/QurbanPage.vue'), meta: { module: 'qurban' } },
      { path: 'distribusi-qurban', component: () => import('pages/DistribusiQurbanPage.vue'), meta: { module: 'distribusi-qurban' } },
      { path: 'tbl-program', component: () => import('pages/TblProgramPage.vue'), meta: { module: 'tbl-program' } },
      { path: 'data-provinsi', component: () => import('pages/DataProvinsiPage.vue'), meta: { module: 'data-provinsi' } },
      { path: 'users', component: () => import('pages/UserPage.vue'), meta: { requiresAdmin: true } }
    ]
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
