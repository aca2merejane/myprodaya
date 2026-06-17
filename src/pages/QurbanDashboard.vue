<template>
  <q-page class="q-pa-md">
    <!-- Header Page with Title and Filters -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Dashboard Laporan Qurban</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Pemantauan titik distribusi, kuota, dan status pemotongan qurban</p>
      </div>

      <div class="row items-center q-gutter-xs">
        <!-- Office Selector -->
        <q-select
          v-model="filters.office"
          :options="officeOptions"
          option-label="kantor"
          option-value="officeid"
          label="Kantor"
          outlined
          dense
          emit-value
          map-options
          style="min-width: 170px"
          bg-color="white"
          @update:model-value="handleFilterChange"
        >
          <template v-slot:prepend>
            <q-icon name="apartment" size="xs" />
          </template>
        </q-select>

        <!-- Year Selector -->
        <q-select
          v-model="filters.year"
          :options="yearOptions"
          label="Tahun"
          outlined
          dense
          style="min-width: 90px"
          bg-color="white"
          @update:model-value="handleFilterChange"
        >
          <template v-slot:prepend>
            <q-icon name="calendar_today" size="xs" />
          </template>
        </q-select>

        <!-- Product Selector -->
        <q-select
          v-model="filters.product"
          :options="productOptions"
          label="Produk"
          outlined
          dense
          clearable
          style="min-width: 150px"
          bg-color="white"
          @update:model-value="fetchDashboardData"
        >
          <template v-slot:prepend>
            <q-icon name="shopping_bag" size="xs" />
          </template>
        </q-select>
      </div>
    </div>

    <!-- Active Filters Banner -->
    <div v-if="filters.status || filters.product" class="row items-center q-gutter-sm q-mb-md bg-orange-1 q-pa-sm rounded-borders border-card border-orange-2">
      <div class="text-caption text-bold text-orange-9 font-outfit q-mr-sm">Filter Aktif:</div>
      
      <q-chip
        v-if="filters.status"
        removable
        color="indigo-8"
        text-color="white"
        dense
        @remove="toggleStatusFilter(filters.status)"
      >
        Status: {{ filters.status }}
      </q-chip>
      
      <q-chip
        v-if="filters.product"
        removable
        color="orange-8"
        text-color="white"
        dense
        @remove="toggleProductFilter(filters.product)"
      >
        Produk: {{ filters.product }}
      </q-chip>
      
      <q-space />
      
      <q-btn
        flat
        dense
        size="sm"
        color="orange-9"
        label="Hapus Semua Filter"
        icon="clear_all"
        no-caps
        class="text-bold"
        @click="clearAllInteractiveFilters"
      />
    </div>

    <!-- Core Metrics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Metric 1: Total Hewan Qurban -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Total Transaksi</div>
              <div class="text-h5 text-weight-bold text-orange-9 font-outfit q-mt-sm">
                {{ stats.aggregates.total_animals || 0 }} Ekor
              </div>
            </div>
            <q-avatar color="orange-1" text-color="orange-9" icon="pets" size="48px" />
          </div>
          <div class="card-accent bg-orange"></div>
        </q-card>
      </div>

      <!-- Metric 2: Total Qty -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Jumlah Hewan (Qty)</div>
              <div class="text-h5 text-weight-bold text-red-9 font-outfit q-mt-sm">
                {{ stats.aggregates.total_qty || 0 }} Unit
              </div>
            </div>
            <q-avatar color="red-1" text-color="red-9" icon="pie_chart" size="48px" />
          </div>
          <div class="card-accent bg-red"></div>
        </q-card>
      </div>

      <!-- Metric 3: Total Nominal -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Total Nominal</div>
              <div class="text-h5 text-weight-bold text-deep-orange-9 font-outfit q-mt-sm">
                {{ formatRupiah(stats.aggregates.total_nominal) }}
              </div>
            </div>
            <q-avatar color="deep-orange-1" text-color="deep-orange-9" icon="payments" size="48px" />
          </div>
          <div class="card-accent bg-deep-orange"></div>
        </q-card>
      </div>

      <!-- Metric 4: Total Donatur -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Total Donatur</div>
              <div class="text-h5 text-weight-bold text-indigo-9 font-outfit q-mt-sm">
                {{ stats.aggregates.total_donators || 0 }} Orang
              </div>
            </div>
            <q-avatar color="indigo-1" text-color="indigo-9" icon="volunteer_activism" size="48px" />
          </div>
          <div class="card-accent bg-indigo"></div>
        </q-card>
      </div>
    </div>

    <!-- Graphics and Status Summary -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Left Panel: Status Breakdown with Progress Bars -->
      <div class="col-12 col-md-4">
        <q-card class="chart-card bg-white q-pa-md border-card full-height">
          <div class="text-subtitle1 text-weight-bold text-dark q-mb-md font-outfit">
            Status Distribusi & Pemotongan
          </div>

          <div class="column q-gutter-md q-pt-sm">
            <div
              v-for="status in statusPercentages"
              :key="status.name"
              class="q-mb-sm q-pa-sm rounded-borders cursor-pointer transition-all hover-bg-grey-2"
              :class="{
                'bg-indigo-1 text-indigo-9 text-weight-bold': filters.status === status.dbKey
              }"
              :style="filters.status === status.dbKey ? 'border: 1px solid #3f51b5;' : 'border: 1px solid transparent;'"
              @click="toggleStatusFilter(status.dbKey)"
            >
              <div class="row justify-between items-center q-mb-xs">
                <span class="row items-center">
                  <q-badge :color="status.color" class="q-mr-sm" rounded />
                  <span class="text-weight-bold text-grey-8">{{ status.name }}</span>
                </span>
                <span class="text-weight-bold text-dark">{{ status.percentage }}% ({{ status.count }})</span>
              </div>
              <q-linear-progress :value="status.ratio" :color="status.color" class="rounded-borders" height="8px" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Right Panel: Products Breakdown -->
      <div class="col-12 col-md-8">
        <q-card class="chart-card bg-white q-pa-md border-card full-height">
          <div class="text-subtitle1 text-weight-bold text-dark q-mb-md font-outfit">
            Rincian Produk Qurban Terlaris
          </div>

          <div class="scroll" style="max-height: 280px;">
            <q-list separator>
              <q-item
                v-for="prod in stats.productBreakdown"
                :key="prod.produk"
                clickable
                class="q-py-md rounded-borders q-my-xs transition-all hover-bg-grey-2"
                :class="{
                  'bg-orange-1 text-orange-9 text-weight-bold': filters.product === prod.produk
                }"
                :style="filters.product === prod.produk ? 'border: 1px solid #e64a19;' : 'border: 1px solid transparent;'"
                @click="toggleProductFilter(prod.produk)"
              >
                <q-item-section avatar>
                  <q-avatar color="orange-1" text-color="orange-9" icon="shopping_bag" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-grey-8">{{ prod.produk || 'Produk Lain' }}</q-item-label>
                  <q-item-label caption class="text-grey-6">{{ prod.count }} Ekor terjual</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="orange-1" text-color="orange-9" class="text-bold q-pa-sm font-outfit">
                    {{ formatRupiah(prod.amount) }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Map Sebaran Hewan Qurban -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card class="map-card bg-white q-pa-md border-card" :class="{ 'map-card-expanded': isMapExpanded }">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-dark font-outfit">
                <q-icon name="map" color="orange-9" class="q-mr-xs" />
                Peta Sebaran Distribusi Hewan Qurban
              </div>
              <div class="text-caption text-grey-6">Klik pin lokasi untuk melihat rincian produk qurban, jumlah nominal, dan penanggung jawab (PJ)</div>
            </div>
            <q-btn
              flat
              round
              dense
              :icon="isMapExpanded ? 'fullscreen_exit' : 'fullscreen'"
              color="orange-9"
              @click="toggleMapExpand"
            >
              <q-tooltip>{{ isMapExpanded ? 'Kecilkan Peta' : 'Perbesar Peta' }}</q-tooltip>
            </q-btn>
          </div>
          <div id="qurban-map" class="map-container rounded-borders" style="height: 400px;"></div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import L from 'leaflet'

const authStore = useAuthStore()
const isMapExpanded = ref(false)
const toggleMapExpand = () => {
  isMapExpanded.value = !isMapExpanded.value
  nextTick(() => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize(true)
      }, 100)
    }
  })
}

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const filters = reactive({
  office: authStore.user?.office || '0',
  year: new Date().getFullYear(),
  product: null,
  status: null
})

const stats = ref({
  aggregates: {
    total_animals: 0,
    total_qty: 0,
    total_nominal: 0,
    total_donators: 0
  },
  statusBreakdown: [],
  productBreakdown: [],
  mapData: []
})

const officeOptions = ref([{ officeid: '0', kantor: '0 - LAZNAS BMH (Pusat)' }])
const productOptions = ref([])

let mapInstance = null
let markerGroup = null

// Formatter Helpers
const formatRupiah = (val) => {
  const num = parseFloat(val || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

// Compute status ratio breakdown
const statusPercentages = computed(() => {
  const rawBreakdown = stats.value.statusBreakdown || []
  const totalCount = rawBreakdown.reduce((sum, item) => sum + parseInt(item.count || 0), 0)

  const statusList = [
    { name: 'FINISH', color: 'teal-8', dbKey: 'FINISH' },
    { name: 'VERIFIKASI', color: 'indigo-8', dbKey: 'VERIFIKASI' },
    { name: 'TERPOTONG', color: 'orange-8', dbKey: 'TERPOTONG' },
    { name: 'TERDISTRIBUSI', color: 'blue-8', dbKey: 'TERDISTRIBUSI' },
    { name: 'OPEN', color: 'grey-8', dbKey: 'OPEN' }
  ]

  return statusList.map(st => {
    const dbItem = rawBreakdown.find(b => (b.status || '').toUpperCase() === st.dbKey)
    const count = dbItem ? parseInt(dbItem.count || 0) : 0
    const ratio = totalCount > 0 ? (count / totalCount) : 0
    return {
      name: st.name,
      color: st.color,
      count,
      ratio,
      percentage: Math.round(ratio * 100),
      dbKey: st.dbKey
    }
  })
})

// Fetch active offices
const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
    
    // Automatically match user office
    const userOff = authStore.user?.office || '0'
    const found = response.data.find(o => o.officeid === userOff)
    if (found) {
      filters.office = found.officeid
    }
  } catch (error) {
    console.error('Fetch offices failed:', error)
  }
}

// Fetch products for filter dropdown
const fetchProductOptions = async () => {
  try {
    // Fetch unique products directly from server stats
    const response = await api.get('/qurban/dashboard-stats', {
      params: { office: filters.office === '0' ? undefined : filters.office, year: filters.year }
    })
    const list = response.data.productBreakdown || []
    productOptions.value = list.map(p => p.produk).filter(p => !!p)
  } catch (error) {
    console.error('Fetch products options failed:', error)
  }
}

// Fetch stats and refresh UI
const fetchDashboardData = async () => {
  try {
    const response = await api.get('/qurban/dashboard-stats', {
      params: {
        office: filters.office === '0' ? undefined : filters.office,
        year: filters.year,
        product: filters.product || undefined,
        status: filters.status || undefined
      }
    })
    
    stats.value = response.data
    
    // Update map points
    nextTick(() => {
      renderMapPoints(response.data.mapData || [])
    })
  } catch (error) {
    console.error('Fetch qurban dashboard stats failed:', error)
  }
}

// Interactive filters toggles
const toggleStatusFilter = (statusName) => {
  if (filters.status === statusName) {
    filters.status = null
  } else {
    filters.status = statusName
  }
  fetchDashboardData()
}

const toggleProductFilter = (productName) => {
  if (filters.product === productName) {
    filters.product = null
  } else {
    filters.product = productName
  }
  fetchDashboardData()
}

const clearAllInteractiveFilters = () => {
  filters.status = null
  filters.product = null
  fetchDashboardData()
}

const handleFilterChange = async () => {
  await fetchProductOptions()
  if (filters.product && !productOptions.value.includes(filters.product)) {
    filters.product = null
  }
  await fetchDashboardData()
}

// Initialize Leaflet Map
const initMap = () => {
  if (mapInstance) return

  mapInstance = L.map('qurban-map').setView([-2.5489, 118.0149], 5)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance)
}

// Render pins on Leaflet Map
const renderMapPoints = (points) => {
  if (!mapInstance || !markerGroup || !L) return

  // Clear existing markers
  markerGroup.clearLayers()

  if (points.length === 0) return

  const bounds = L.latLngBounds()

  points.forEach(pt => {
    if (!pt.lat || !pt.lng) return

    // Custom deep orange marker for qurban
    const customIcon = L.divIcon({
      html: '<div class="map-pin" style="background-color: #ff5722;"></div>',
      className: 'custom-leaflet-pin-qurban',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })

    const marker = L.marker([pt.lat, pt.lng], { icon: customIcon })
    
    // Build tabular breakdown for popup tooltip
    let qurbanRows = ''
    pt.qurbans.forEach(q => {
      qurbanRows += `
        <tr>
          <td style="padding: 3px 6px; font-size: 10px;">${q.product}</td>
          <td style="padding: 3px 6px; font-size: 10px;" align="center"><b>${q.qty}</b></td>
        </tr>
      `
    })

    const popupContent = `
      <div class="map-popup-card" style="min-width: 200px;">
        <div class="popup-title font-outfit" style="color: #d84315;">${pt.name}</div>
        <div class="popup-info"><b>PJ Lapangan:</b> ${pt.user_pj || 'Belum Ditentukan'}</div>
        <div class="popup-info"><b>Wilayah:</b> ${pt.address}</div>
        
        <table border="1" bordercolor="#e0e0e0" style="border-collapse: collapse; width: 100%; margin-top: 6px; background: #fafafa;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th align="left" style="padding: 3px 6px; font-size: 10px;">Jenis Qurban</th>
              <th style="padding: 3px 6px; font-size: 10px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${qurbanRows}
          </tbody>
        </table>
        
        <div class="row justify-between items-center q-mt-sm border-top q-pt-xs">
          <span style="font-size: 11px;">Total Ekor: <b>${pt.totalQty}</b></span>
          <span class="text-weight-bold" style="font-size: 12px; color: #e64a19;">${formatRupiah(pt.totalAmount)}</span>
        </div>
      </div>
    `
    marker.bindPopup(popupContent)
    markerGroup.addLayer(marker)
    bounds.extend([pt.lat, pt.lng])
  })

  if (points.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
  }
}

onMounted(async () => {
  await fetchOffices()
  await fetchProductOptions()
  initMap()
  await fetchDashboardData()
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="scss">
.border-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.02) !important;
}

.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.map-card-expanded {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  overflow: hidden !important;
  
  .map-container {
    height: calc(100vh - 70px) !important;
  }
}

.hover-bg-grey-2 {
  transition: background-color 0.2s ease;
  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
}

.transition-all {
  transition: all 0.2s ease;
}

.border-orange-2 {
  border: 1px solid #ffcc80 !important;
}
</style>
