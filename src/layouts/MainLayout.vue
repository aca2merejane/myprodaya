<template>
  <q-layout view="hHh Lpr lff" class="dashboard-layout">
    <!-- Glowing background elements -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    <div class="bg-blob blob-3"></div>

    <q-header class="glass-header" height-hint="64">
      <q-toolbar class="q-py-sm">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          :color="$q.dark.isActive ? 'white' : 'grey-9'"
        />

        <q-toolbar-title class="row items-center no-wrap">
          <span class="text-weight-bold text-gradient font-outfit q-mr-sm">BMH</span>
          <span class="text-weight-light font-outfit hidden-xs" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'">| Prodaya Portal</span>
        </q-toolbar-title>

        <q-space />

        <!-- Top Right Profile info -->
        <div class="row items-center q-gutter-sm">
          <q-chip
            outline
            :color="$q.dark.isActive ? 'white' : 'primary'"
            :text-color="$q.dark.isActive ? 'white' : 'primary'"
            icon="location_on"
            class="q-px-md hidden-xs glass-chip"
          >
            {{ authStore.user?.officeName || authStore.user?.office || 'LAZNAS BMH' }}
          </q-chip>

          <!-- Theme Toggle Button -->
          <q-btn
            flat
            round
            dense
            :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
            :color="$q.dark.isActive ? 'amber-6' : 'grey-8'"
            @click="toggleDarkMode"
            class="q-mx-xs"
          >
            <q-tooltip>{{ $q.dark.isActive ? 'Mode Terang' : 'Mode Gelap' }}</q-tooltip>
          </q-btn>

          <q-btn-dropdown flat round no-caps dense>
            <template v-slot:label>
              <q-avatar color="primary" text-color="white" size="36px">
                {{ authStore.user?.name ? authStore.user.name[0].toUpperCase() : 'U' }}
              </q-avatar>
            </template>

            <q-list style="min-width: 200px" class="glass-dropdown-list">
              <q-item class="q-py-md">
                <q-item-section>
                  <div class="text-weight-bold" :class="$q.dark.isActive ? 'text-white' : 'text-grey-9'">{{ authStore.user?.name }}</div>
                  <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">{{ authStore.user?.email || authStore.user?.login }}</div>
                  <div class="q-mt-sm">
                    <q-badge color="accent" text-color="white" v-if="authStore.isAdmin">Admin</q-badge>
                    <q-badge color="primary" text-color="white" v-else>PIC Area</q-badge>
                  </div>
                </q-item-section>
              </q-item>
              
              <q-separator :dark="$q.dark.isActive" />
              
              <q-item clickable v-close-popup @click="handleLogout" class="text-red-4">
                <q-item-section avatar>
                  <q-icon name="logout" color="red-4" />
                </q-item-section>
                <q-item-section>Keluar</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="280"
      class="glass-drawer"
    >
      <div class="column full-height justify-between">
        <!-- Top Section of Sidebar -->
        <div>
          <!-- Logo & Brand Header -->
          <div class="brand-header q-pa-lg row items-center no-wrap bg-transparent">
            <q-img
              src="/logo_bmh.png"
              width="44px"
              fit="contain"
              class="q-mr-md filter-shadow"
            />
            <div>
              <div class="text-subtitle1 text-weight-bold tracking-wide" :class="$q.dark.isActive ? 'text-white' : 'text-grey-9'">MY PRODAYA</div>
              <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">Manajemen Penyaluran</div>
            </div>
          </div>

          <!-- User Card in Sidebar -->
          <div class="user-card-sidebar q-mx-md q-my-md q-pa-md rounded-borders">
            <div class="row items-center no-wrap">
              <q-avatar color="primary" text-color="white" size="40px" class="q-mr-md">
                {{ authStore.user?.name ? authStore.user.name[0].toUpperCase() : 'U' }}
              </q-avatar>
              <div class="overflow-hidden">
                <div class="text-weight-bold ellipsis" :class="$q.dark.isActive ? 'text-white' : 'text-grey-9'">{{ authStore.user?.name }}</div>
                <div class="text-caption ellipsis" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">{{ authStore.user?.email || authStore.user?.login }}</div>
              </div>
            </div>
          </div>

          <!-- Navigation Links -->
          <q-list class="q-px-sm">
            <template v-if="allowedDashboards.length > 0">
              <q-item-label header class="text-bold text-xs q-pl-md q-pt-md q-pb-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">DASHBOARDS</q-item-label>

              <q-item
                v-for="link in allowedDashboards"
                :key="link.title"
                clickable
                :to="link.route"
                active-class="nav-active"
                class="nav-item rounded-borders q-my-xs"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'"
              >
                <q-item-section avatar>
                  <q-icon :name="link.icon" />
                </q-item-section>
                <q-item-section class="text-weight-medium">{{ link.title }}</q-item-section>
              </q-item>
            </template>

            <template v-if="allowedDataLinks.length > 0">
              <q-separator :dark="$q.dark.isActive" class="q-my-sm" />

              <q-item-label header class="text-bold text-xs q-pl-md q-pt-sm q-pb-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">TRANSAKSI & DATA</q-item-label>

              <q-item
                v-for="link in allowedDataLinks"
                :key="link.title"
                clickable
                :to="link.route"
                active-class="nav-active"
                class="nav-item rounded-borders q-my-xs"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'"
              >
                <q-item-section avatar>
                  <q-icon :name="link.icon" />
                </q-item-section>
                <q-item-section class="text-weight-medium">{{ link.title }}</q-item-section>
              </q-item>
            </template>

            <!-- Admin Section Menu -->
            <template v-if="allowedAdminLinks.length > 0">
              <q-separator :dark="$q.dark.isActive" class="q-my-sm" />
              <q-item-label header class="text-bold text-xs q-pl-md q-pt-sm q-pb-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">ADMINISTRATOR</q-item-label>

              <q-item
                v-for="link in allowedAdminLinks"
                :key="link.title"
                clickable
                :to="link.route"
                active-class="nav-active"
                class="nav-item rounded-borders q-my-xs"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'"
              >
                <q-item-section avatar>
                  <q-icon :name="link.icon" />
                </q-item-section>
                <q-item-section class="text-weight-medium">{{ link.title }}</q-item-section>
              </q-item>
            </template>
          </q-list>
        </div>

        <!-- Bottom Section of Sidebar -->
        <div class="q-pa-md">
          <q-btn
            flat
            color="red-4"
            icon="logout"
            label="Keluar Aplikasi"
            class="full-width rounded-borders text-bold q-py-sm btn-logout"
            no-caps
            @click="handleLogout"
          />
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <!-- Transition for page navigation -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const leftDrawerOpen = ref(false)

const allowedDashboards = computed(() => dashboards.filter(l => authStore.hasAccess(l.module)))
const allowedDataLinks = computed(() => dataLinks.filter(l => authStore.hasAccess(l.module)))
const allowedAdminLinks = computed(() => {
  return adminLinks.filter(l => {
    if (l.module === 'users') return authStore.isAdmin
    return authStore.hasAccess(l.module)
  })
})

const dashboards = [
  { title: 'Dashboard Penyaluran', icon: 'dashboard', route: '/dashboard', module: 'dashboard' },
  { title: 'Dashboard Qurban', icon: 'insights', route: '/qurban-dashboard', module: 'qurban-dashboard' }
]

const dataLinks = [
  { title: 'Data Mustahik', icon: 'people', route: '/mustahik', module: 'mustahik' },
  { title: 'Pengajuan', icon: 'volunteer_activism', route: '/penyaluran', module: 'penyaluran' },
  { title: 'Verifikasi', icon: 'fact_check', route: '/verifikasi-penyaluran', module: 'verifikasi-penyaluran' },
  { title: 'Manajemen Qurban', icon: 'workspace_premium', route: '/qurban', module: 'qurban' }
]

const adminLinks = [
  { title: 'Pengaturan Titik Qurban', icon: 'settings_suggest', route: '/distribusi-qurban', module: 'distribusi-qurban' },
  { title: 'Pengaturan Program', icon: 'list_alt', route: '/tbl-program', module: 'tbl-program' },
  { title: 'Pengaturan Provinsi', icon: 'map', route: '/data-provinsi', module: 'data-provinsi' },
  { title: 'Manajemen User', icon: 'manage_accounts', route: '/users', module: 'users' }
]

// Initialize dark mode from LocalStorage or system preference
onMounted(() => {
  const isDark = $q.localStorage.getItem('darkMode')
  if (isDark !== null) {
    $q.dark.set(isDark)
  } else {
    // Default to dark mode to match the initial project aesthetics
    $q.dark.set(true)
  }
})

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function toggleDarkMode () {
  $q.dark.toggle()
  $q.localStorage.set('darkMode', $q.dark.isActive)
}

function handleLogout () {
  authStore.logout()
  router.push('/login')
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.tracking-wide {
  letter-spacing: 1.2px;
}

.dashboard-layout {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
  transition: background-color 0.3s ease;
}

/* Glowing background blobs (same as login) */
.dashboard-layout .bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  z-index: 0;
  pointer-events: none;
  animation: float-blob 15s infinite alternate ease-in-out;
  transition: opacity 0.3s ease;
  
  .body--light & {
    opacity: 0.05; /* softer for light mode */
  }
  .body--dark & {
    opacity: 0.15; /* normal for dark mode */
  }
}
.dashboard-layout .blob-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #2196f3, #0d47a1);
  top: -10%;
  left: -10%;
}
.dashboard-layout .blob-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #00e676, #00c853);
  bottom: -15%;
  right: -10%;
  animation-delay: 2s;
}
.dashboard-layout .blob-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, #ab47bc, #7b1fa2);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-duration: 20s;
}

/* Glassmorphism Header */
.glass-header {
  backdrop-filter: blur(16px);
  transition: all 0.3s ease;
  
  .body--light & {
    background: rgba(255, 255, 255, 0.75) !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
    color: #1e293b !important;
  }
  .body--dark & {
    background: rgba(11, 15, 25, 0.75) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #ffffff !important;
  }
}

/* Glassmorphism Drawer */
.glass-drawer {
  backdrop-filter: blur(16px);
  transition: all 0.3s ease;
  
  .body--light & {
    background: rgba(255, 255, 255, 0.8) !important;
    border-right: 1px solid rgba(0, 0, 0, 0.06) !important;
    color: #1e293b !important;
  }
  .body--dark & {
    background: rgba(30, 41, 59, 0.75) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #ffffff !important;
  }
}

.text-gradient {
  background: linear-gradient(135deg, #64b5f6, #2196f3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.glass-chip {
  transition: all 0.3s ease;
  
  .body--light & {
    background: rgba(0, 0, 0, 0.03) !important;
    border: 1px solid rgba(0, 0, 0, 0.06) !important;
  }
  .body--dark & {
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
}

.glass-dropdown-list {
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
  
  .body--light & {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #1e293b !important;
  }
  .body--dark & {
    background: rgba(17, 24, 39, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #ffffff !important;
  }
}

.btn-logout {
  background-color: rgba(239, 68, 68, 0.08) !important;
  border: 1px solid rgba(239, 68, 68, 0.15) !important;
  transition: all 0.3s ease;
  &:hover {
    background-color: rgba(239, 68, 68, 0.2) !important;
    transform: translateY(-1px);
  }
}

.user-card-sidebar {
  transition: all 0.3s ease;
  
  .body--light & {
    background-color: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  .body--dark & {
    background-color: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.nav-item {
  transition: all 0.3s ease;
  &:hover {
    .body--light & {
      background-color: rgba(0, 0, 0, 0.03);
      color: #1b5e20 !important;
    }
    .body--dark & {
      background-color: rgba(255, 255, 255, 0.05);
      color: white !important;
    }
  }
}

.nav-active {
  background: linear-gradient(135deg, #4caf50, #2e7d32) !important;
  color: white !important;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.35);
}

.text-xs {
  font-size: 0.75rem;
  letter-spacing: 1px;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
