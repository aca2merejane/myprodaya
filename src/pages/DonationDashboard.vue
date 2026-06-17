<template>
  <q-page class="q-pa-md">
    <!-- Header Page with Title and Filters -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Dashboard Penyaluran</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Ringkasan realisasi program donasi dan sebaran mustahik</p>
      </div>

      <div class="row items-center q-gutter-sm">
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
          style="min-width: 200px"
          bg-color="white"
          @update:model-value="fetchDashboardData"
        >
          <template v-slot:prepend>
            <q-icon name="apartment" />
          </template>
        </q-select>

        <!-- Year Selector -->
        <q-select
          v-model="filters.year"
          :options="yearOptions"
          label="Tahun"
          outlined
          dense
          style="min-width: 100px"
          bg-color="white"
          @update:model-value="fetchDashboardData"
        >
          <template v-slot:prepend>
            <q-icon name="calendar_today" />
          </template>
        </q-select>

        <!-- Month Selector -->
        <q-select
          v-model="filters.month"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          label="Bulan"
          outlined
          dense
          emit-value
          map-options
          style="min-width: 150px"
          bg-color="white"
          @update:model-value="fetchDashboardData"
        >
          <template v-slot:prepend>
            <q-icon name="date_range" />
          </template>
        </q-select>
      </div>
    </div>

    <!-- Core Metrics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Metric 1: Total Pengajuan -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Total Pengajuan</div>
              <div class="text-h5 text-weight-bold text-blue-9 font-outfit q-mt-sm">
                {{ formatRupiah(stats.aggregates.total_pengajuan) }}
              </div>
            </div>
            <q-avatar color="blue-1" text-color="blue-9" icon="request_quote" size="48px" />
          </div>
          <div class="card-accent bg-blue"></div>
        </q-card>
      </div>

      <!-- Metric 2: Total Disetujui (ACC) -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Disetujui (ACC)</div>
              <div class="text-h5 text-weight-bold text-indigo-9 font-outfit q-mt-sm">
                {{ formatRupiah(stats.aggregates.total_acc) }}
              </div>
            </div>
            <q-avatar color="indigo-1" text-color="indigo-9" icon="task_alt" size="48px" />
          </div>
          <div class="card-accent bg-indigo"></div>
        </q-card>
      </div>

      <!-- Metric 3: Total Realisasi -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Realisasi Salur</div>
              <div class="text-h5 text-weight-bold text-teal-9 font-outfit q-mt-sm">
                {{ formatRupiah(stats.aggregates.total_realisasi) }}
              </div>
            </div>
            <q-avatar color="teal-1" text-color="teal-9" icon="payments" size="48px" />
          </div>
          <div class="card-accent bg-teal"></div>
        </q-card>
      </div>

      <!-- Metric 4: Mustahik Count -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="metric-card bg-white q-pa-md relative-position overflow-hidden border-card">
          <div class="row items-center no-wrap justify-between">
            <div>
              <div class="text-grey-7 text-subtitle2 text-bold text-uppercase tracking-wider">Penerima Manfaat</div>
              <div class="text-h5 text-weight-bold text-amber-9 font-outfit q-mt-sm">
                {{ stats.aggregates.unique_mustahik || 0 }} Mustahik
              </div>
            </div>
            <q-avatar color="amber-1" text-color="amber-9" icon="people" size="48px" />
          </div>
          <div class="card-accent bg-amber"></div>
        </q-card>
      </div>
    </div>

    <!-- Graphics and Status Summary -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Left Panel: SVG Monthly Trend Chart -->
      <div class="col-12 col-md-8">
        <q-card class="chart-card bg-white q-pa-md border-card full-height">
          <div class="text-subtitle1 text-weight-bold text-dark q-mb-md font-outfit">
            Tren Realisasi Penyaluran Bulanan ({{ filters.year }})
          </div>
          
          <div class="flex flex-center q-py-lg" style="height: 280px; position: relative;">
            <svg v-if="stats.monthlyTrend && stats.monthlyTrend.length > 0" width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none">
              <!-- Y Axis Lines -->
              <line x1="50" y1="20" x2="560" y2="20" stroke="#f0f0f0" stroke-width="1" />
              <line x1="50" y1="70" x2="560" y2="70" stroke="#f0f0f0" stroke-width="1" />
              <line x1="50" y1="120" x2="560" y2="120" stroke="#f0f0f0" stroke-width="1" />
              <line x1="50" y1="170" x2="560" y2="170" stroke="#f0f0f0" stroke-width="1" />
              <line x1="50" y1="210" x2="560" y2="210" stroke="#9e9e9e" stroke-width="1.5" />

              <!-- Bar Rendering -->
              <g v-for="(bar, index) in chartBars" :key="index">
                <rect
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.width"
                  :height="bar.height"
                  fill="url(#barGradient)"
                  rx="4"
                  class="svg-bar"
                >
                  <title>{{ bar.monthName }}: {{ formatRupiah(bar.value) }}</title>
                </rect>
                <!-- Month Labels -->
                <text :x="bar.x + bar.width/2" y="225" fill="#757575" font-size="10" text-anchor="middle">
                  {{ bar.monthAbbr }}
                </text>
              </g>

              <!-- Gradients Definition -->
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2196f3" />
                  <stop offset="100%" stop-color="#1976d2" />
                </linearGradient>
              </defs>
            </svg>
            <div v-else class="text-grey-5 text-center">
              <q-icon name="bar_chart" size="48px" class="q-mb-xs" />
              <div>Tidak ada data transaksi penyaluran di tahun ini</div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Right Panel: Status Breakdown with Progress Bars -->
      <div class="col-12 col-md-4">
        <q-card class="chart-card bg-white q-pa-md border-card full-height">
          <div class="text-subtitle1 text-weight-bold text-dark q-mb-md font-outfit">
            Status Penyaluran
          </div>

          <div class="column q-gutter-md q-pt-sm">
            <div v-for="status in statusPercentages" :key="status.name" class="q-mb-sm">
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
    </div>

    <!-- Map and Program Breakdown Grid -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Left: Spread Map -->
      <div class="col-12 col-md-7">
        <q-card class="map-card bg-white q-pa-md border-card" :class="{ 'map-card-expanded': isMapExpanded }">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-bold text-dark font-outfit">
              <q-icon name="map" color="primary" class="q-mr-xs" />
              Titik Sebaran Mustahik Donasi
            </div>
            <div class="row items-center q-gutter-sm">
              <div class="text-caption text-grey-6 hidden-xs" v-if="!mapFilter && !groupingMapFilter">Menampilkan lokasi tempat mustahik disalurkan</div>
              <div class="row items-center q-gutter-xs">
                <q-chip v-if="mapFilter" color="blue-1" text-color="blue-9" dense class="text-bold text-caption q-px-sm" icon="filter_alt" removable @remove="clearMapFilter">
                  Rincian: {{ mapFilter }}
                </q-chip>
                <q-chip v-if="groupingMapFilter" color="teal-1" text-color="teal-9" dense class="text-bold text-caption q-px-sm" icon="category" removable @remove="clearGroupingMapFilter">
                  Grup: {{ groupingMapFilter }}
                </q-chip>
              </div>
              <q-btn
                flat
                round
                dense
                :icon="isMapExpanded ? 'fullscreen_exit' : 'fullscreen'"
                color="primary"
                @click="toggleMapExpand"
              >
                <q-tooltip>{{ isMapExpanded ? 'Kecilkan Peta' : 'Perbesar Peta' }}</q-tooltip>
              </q-btn>
            </div>
          </div>
          <div id="mustahik-map" class="map-container rounded-borders"></div>
        </q-card>
      </div>

      <!-- Right: Program/Sub Program/SDGs Breakdown Table -->
      <div class="col-12 col-md-5">
        <q-card class="program-card bg-white q-pa-md border-card full-height column justify-between">
          <div>
            <div class="text-subtitle1 text-weight-bold text-dark q-mb-xs font-outfit">
              <q-icon name="list_alt" color="primary" class="q-mr-xs" />
              Rincian Realisasi Penyaluran
            </div>
            <div class="text-caption text-grey-6 q-mb-md">Klik rincian di bawah untuk memfilter marker di peta</div>

            <q-tabs
              v-model="activeTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
              @update:model-value="clearMapFilter"
            >
              <q-tab name="program" label="Program & Sub" />
              <q-tab name="sdgs" label="SDGs" />
            </q-tabs>

            <q-separator />

            <!-- Program Tree View -->
            <div v-if="activeTab === 'program'" class="program-list scroll q-mt-sm" style="max-height: 280px;">
              <div v-if="stats.programTree && stats.programTree.length > 0">
                <q-list class="q-gutter-xs">
                  <q-expansion-item
                    v-for="(prog, idx) in stats.programTree"
                    :key="prog.name"
                    dense
                    dense-toggle
                    expand-separator
                    header-class="q-pr-sm"
                    class="rounded-borders overflow-hidden border-accordion q-mb-xs"
                  >
                    <template v-slot:header>
                      <q-item-section avatar class="cursor-pointer" @click.stop="toggleMapFilterTree(prog.name, 'sub_program')">
                        <q-avatar :color="isItemFilteredTree(prog.name, 'sub_program') ? 'primary' : 'primary-1'" :text-color="isItemFilteredTree(prog.name, 'sub_program') ? 'white' : 'primary'" font-size="12px" size="28px">
                          {{ idx + 1 }}
                        </q-avatar>
                      </q-item-section>

                      <q-item-section class="cursor-pointer" @click.stop="toggleMapFilterTree(prog.name, 'sub_program')">
                        <q-item-label class="text-weight-bold font-outfit" :class="isItemFilteredTree(prog.name, 'sub_program') ? 'text-primary' : ($q.dark.isActive ? 'text-grey-3' : 'text-grey-9')">
                          {{ prog.name || 'Lainnya / Umum' }}
                        </q-item-label>
                        <q-item-label caption class="text-grey-6 text-xs">Realisasi Sub Prog</q-item-label>
                      </q-item-section>

                      <q-item-section side class="cursor-pointer" @click.stop="toggleMapFilterTree(prog.name, 'sub_program')">
                        <q-badge :color="isItemFilteredTree(prog.name, 'sub_program') ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'teal-1')" :text-color="isItemFilteredTree(prog.name, 'sub_program') ? 'white' : 'teal-9'" class="text-bold q-pa-sm font-outfit text-xs">
                          {{ formatRupiah(prog.amount) }}
                        </q-badge>
                      </q-item-section>
                    </template>

                    <q-card class="bg-transparent no-shadow">
                      <q-card-section class="q-py-none q-pl-md q-pr-none">
                        <q-list dense separator>
                          <q-item
                            v-for="sub in prog.children"
                            :key="sub.name"
                            clickable
                            class="q-py-sm rounded-borders nav-item-breakdown"
                            :class="{ 'bg-blue-1 text-primary text-bold': isItemFilteredTree(sub.name, 'detail_program') }"
                            @click="toggleMapFilterTree(sub.name, 'detail_program')"
                          >
                            <q-item-section avatar>
                              <q-icon name="subdirectory_arrow_right" :color="isItemFilteredTree(sub.name, 'detail_program') ? 'primary' : 'grey-5'" size="xs" />
                            </q-item-section>
                            
                            <q-item-section>
                              <q-item-label :class="isItemFilteredTree(sub.name, 'detail_program') ? 'text-primary' : ($q.dark.isActive ? 'text-grey-4' : 'text-grey-8')">
                                {{ sub.name || 'Umum' }}
                              </q-item-label>
                            </q-item-section>

                            <q-item-section side>
                              <q-badge :color="isItemFilteredTree(sub.name, 'detail_program') ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-2')" :text-color="isItemFilteredTree(sub.name, 'detail_program') ? 'white' : ($q.dark.isActive ? 'grey-4' : 'grey-8')" class="text-bold q-pa-xs font-outfit text-xs">
                                {{ formatRupiah(sub.amount) }}
                              </q-badge>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </div>
              <div v-else class="flex flex-center q-pa-lg text-grey-5">
                Tidak ada rincian data program
              </div>
            </div>

            <!-- SDGs List View -->
            <div v-else class="program-list scroll q-mt-sm" style="max-height: 280px;">
              <div v-if="stats.sdgsBreakdown && stats.sdgsBreakdown.length > 0">
                <q-list separator>
                  <q-item
                    v-for="(item, idx) in stats.sdgsBreakdown"
                    :key="item.name"
                    class="q-py-md cursor-pointer rounded-borders nav-item-breakdown"
                    :class="{ 'bg-blue-1 text-primary text-bold': isItemFilteredTree(item.name, 'sdgs') }"
                    clickable
                    @click="toggleMapFilterTree(item.name, 'sdgs')"
                  >
                    <q-item-section avatar>
                      <q-avatar :color="isItemFilteredTree(item.name, 'sdgs') ? 'primary' : 'primary-1'" :text-color="isItemFilteredTree(item.name, 'sdgs') ? 'white' : 'primary'" font-size="14px">
                        {{ idx + 1 }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold" :class="isItemFilteredTree(item.name, 'sdgs') ? 'text-primary' : ($q.dark.isActive ? 'text-grey-3' : 'text-grey-8')">{{ item.name || 'Lainnya / Umum' }}</q-item-label>
                      <q-item-label caption class="text-grey-6">Realisasi SDGs</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge :color="isItemFilteredTree(item.name, 'sdgs') ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'teal-1')" :text-color="isItemFilteredTree(item.name, 'sdgs') ? 'white' : 'teal-9'" class="text-bold q-pa-sm font-outfit">
                        {{ formatRupiah(item.amount) }}
                      </q-badge>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div v-else class="flex flex-center q-pa-lg text-grey-5">
                Tidak ada rincian data SDGs
              </div>
            </div>
          </div>
          
          <div v-if="mapFilter" class="q-mt-sm bg-blue-1 q-pa-sm rounded-borders text-caption text-blue-9 flex justify-between items-center">
            <span class="row items-center"><q-icon name="filter_alt" class="q-mr-xs" />Filter aktif: <b>{{ mapFilter }}</b></span>
            <q-btn flat round dense size="xs" icon="close" @click="clearMapFilter" />
          </div>
        </q-card>
      </div>
    </div>

    <!-- New Card: Grouping breakdown based on Tipe, Sifat, Asnaf & Tipe Penyaluran -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card class="bg-white q-pa-md border-card">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold text-dark font-outfit">
                <q-icon name="category" color="primary" class="q-mr-xs" size="24px" />
                Pengelompokan Realisasi Penyaluran
              </div>
              <div class="text-caption text-grey-6">
                Rincian sebaran realisasi nominal dan kuantitas transaksi penyaluran berdasarkan kategori filter
              </div>
            </div>
          </div>

          <q-tabs
            v-model="groupingTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
            @update:model-value="clearGroupingMapFilter"
          >
            <q-tab name="tipe" label="Tipe (Individu/Lembaga)" />
            <q-tab name="umum_khusus" label="Sifat (Umum/Khusus)" />
            <q-tab name="asnaf" label="Asnaf" />
            <q-tab name="tipe_penyaluran" label="Tipe Penyaluran" />
          </q-tabs>

          <q-separator />

          <div class="q-mt-md">
            <div v-if="activeGroupingList.length > 0" class="row q-col-gutter-md">
              <div
                v-for="(item, idx) in activeGroupingList"
                :key="item.name || idx"
                class="col-12 col-sm-6 col-md-3"
              >
                <q-card
                  class="bg-grey-1 q-pa-md border-card text-dark relative-position overflow-hidden hover-elevation cursor-pointer"
                  :class="{ 'bg-blue-1 text-primary text-bold active-grouping-card': isGroupingItemFiltered(item.name) }"
                  style="min-height: 100px; border: 1px solid rgba(0, 0, 0, 0.04);"
                  @click="toggleGroupingMapFilter(item.name)"
                >
                  <div class="column justify-between full-height">
                    <div>
                      <div class="text-caption text-weight-bold text-grey-7 text-uppercase tracking-wider" :class="{ 'text-primary': isGroupingItemFiltered(item.name) }">
                        {{ item.name || 'Lainnya / Kosong' }}
                      </div>
                      <div class="text-h6 text-weight-bold font-outfit q-mt-xs" :class="isGroupingItemFiltered(item.name) ? 'text-primary' : 'text-teal-9'">
                        {{ formatRupiah(item.amount) }}
                      </div>
                    </div>
                    <div class="row justify-between items-center text-caption q-mt-sm" :class="isGroupingItemFiltered(item.name) ? 'text-primary' : 'text-grey-6'">
                      <span>Jumlah Transaksi:</span>
                      <q-badge :color="isGroupingItemFiltered(item.name) ? 'primary' : 'teal-1'" :text-color="isGroupingItemFiltered(item.name) ? 'white' : 'teal-9'" class="text-bold q-px-sm q-py-xs">
                        {{ item.count }} Transaksi
                      </q-badge>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>
            <div v-else class="flex flex-center q-pa-xl text-grey-5">
              <q-icon name="info" size="32px" class="q-mr-sm" />
              <div>Tidak ada data pengelompokan untuk tab ini</div>
            </div>
          </div>

          <div v-if="groupingMapFilter" class="q-mt-sm bg-teal-1 q-pa-sm rounded-borders text-caption text-teal-9 flex justify-between items-center">
            <span class="row items-center"><q-icon name="filter_alt" class="q-mr-xs" />Filter pengelompokan aktif: <b>{{ groupingMapFilter || 'Lainnya / Kosong' }}</b></span>
            <q-btn flat round dense size="xs" icon="close" @click="clearGroupingMapFilter" />
          </div>
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

const activeTab = ref('program')
const mapFilter = ref(null)
const groupingTab = ref('tipe')
const groupingMapFilter = ref(null)

const isGroupingItemFiltered = (name) => {
  return groupingMapFilter.value === name
}

const toggleGroupingMapFilter = (name) => {
  if (groupingMapFilter.value === name) {
    clearGroupingMapFilter()
  } else {
    groupingMapFilter.value = name
    renderMapPoints(stats.value.mapData || [])
  }
}

const clearGroupingMapFilter = () => {
  groupingMapFilter.value = null
  renderMapPoints(stats.value.mapData || [])
}

const filteredTransactions = computed(() => {
  const points = stats.value.mapData || []
  if (!mapFilter.value) return points

  const filterVal = mapFilter.value
  return points.filter(pt => {
    if (filterType.value === 'sub_program') {
      return pt.sub_programs && pt.sub_programs.includes(filterVal)
    } else if (filterType.value === 'detail_program') {
      return pt.detail_programs && pt.detail_programs.includes(filterVal)
    } else if (filterType.value === 'sdgs') {
      return pt.sdgs && pt.sdgs.includes(filterVal)
    }
    return true
  })
})

const activeGroupingList = computed(() => {
  const list = filteredTransactions.value
  let keyField = 'tipe'
  if (groupingTab.value === 'umum_khusus') keyField = 'umum_khusus'
  else if (groupingTab.value === 'asnaf') keyField = 'asnaf'
  else if (groupingTab.value === 'tipe_penyaluran') keyField = 'tipe_penyaluran'

  const map = {}
  for (const pt of list) {
    const val = pt[keyField] || 'Lainnya / Kosong'
    const amt = parseFloat(pt.amount || 0)
    if (!map[val]) {
      map[val] = { name: val, amount: 0, count: 0 }
    }
    map[val].amount += amt
    map[val].count += 1
  }

  return Object.values(map).sort((a, b) => b.amount - a.amount)
})

const filterType = ref('sub_program') // 'sub_program', 'detail_program', or 'sdgs'

const isItemFilteredTree = (name, type) => {
  return mapFilter.value === name && filterType.value === type
}

const toggleMapFilterTree = (name, type) => {
  if (mapFilter.value === name && filterType.value === type) {
    clearMapFilter()
  } else {
    mapFilter.value = name
    filterType.value = type
    renderMapPoints(stats.value.mapData || [])
  }
}

const clearMapFilter = () => {
  mapFilter.value = null
  filterType.value = 'sub_program'
  renderMapPoints(stats.value.mapData || [])
}

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const filters = reactive({
  office: authStore.user?.office || '0',
  year: new Date().getFullYear(),
  month: 'all'
})

const monthOptions = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
]

const stats = ref({
  aggregates: {
    total_pengajuan: 0,
    total_acc: 0,
    total_realisasi: 0,
    unique_mustahik: 0
  },
  statusBreakdown: [],
  monthlyTrend: [],
  programBreakdown: [],
  subProgramBreakdown: [],
  sdgsBreakdown: [],
  programTree: [],
  tipeBreakdown: [],
  umumKhususBreakdown: [],
  asnafBreakdown: [],
  tipePenyaluranBreakdown: [],
  mapData: []
})

const officeOptions = ref([{ officeid: '0', kantor: '0 - LAZNAS BMH (Pusat)' }])
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

// Compute SVG Bars coordinates
const chartBars = computed(() => {
  if (!stats.value.monthlyTrend || stats.value.monthlyTrend.length === 0) return []
  
  const months = [
    { num: 1, name: 'Januari', abbr: 'Jan' },
    { num: 2, name: 'Februari', abbr: 'Feb' },
    { num: 3, name: 'Maret', abbr: 'Mar' },
    { num: 4, name: 'April', abbr: 'Apr' },
    { num: 5, name: 'Mei', abbr: 'Mei' },
    { num: 6, name: 'Juni', abbr: 'Jun' },
    { num: 7, name: 'Juli', abbr: 'Jul' },
    { num: 8, name: 'Agustus', abbr: 'Agu' },
    { num: 9, name: 'September', abbr: 'Sep' },
    { num: 10, name: 'Oktober', abbr: 'Okt' },
    { num: 11, name: 'November', abbr: 'Nov' },
    { num: 12, name: 'Desember', abbr: 'Des' }
  ]

  // Map database results (month numbers) to all 12 months
  const values = months.map(m => {
    const found = stats.value.monthlyTrend.find(t => t.month === m.num)
    return {
      monthName: m.name,
      monthAbbr: m.abbr,
      value: found ? parseFloat(found.amount || 0) : 0
    }
  })

  // Find max value to scale heights
  const maxVal = Math.max(...values.map(v => v.value), 1)

  const chartWidth = 510
  const barWidth = 24
  const startX = 50
  const gap = (chartWidth - (barWidth * 12)) / 11

  return values.map((v, i) => {
    const height = (v.value / maxVal) * 180 // Max height 180px
    return {
      x: startX + i * (barWidth + gap),
      y: 210 - height, // Chart bottom is at y=210
      width: barWidth,
      height: height,
      value: v.value,
      monthName: v.monthName,
      monthAbbr: v.monthAbbr
    }
  })
})

// Compute status ratio breakdown
const statusPercentages = computed(() => {
  const rawBreakdown = stats.value.statusBreakdown || []
  const totalCount = rawBreakdown.reduce((sum, item) => sum + parseInt(item.count || 0), 0)

  const statusList = [
    { name: 'FINISH', color: 'teal-8', dbKey: 'FINISH' },
    { name: 'PROSES PENCAIRAN', color: 'orange-8', dbKey: 'PROSES PENCAIRAN' },
    { name: 'DITERIMA', color: 'indigo-8', dbKey: 'DITERIMA' },
    { name: 'OPEN', color: 'blue-8', dbKey: 'OPEN' },
    { name: 'MASUK', color: 'grey-8', dbKey: 'MASUK' },
    { name: 'DITOLAK', color: 'red-8', dbKey: 'DITOLAK' }
  ]

  return statusList.map(st => {
    const dbItem = rawBreakdown.find(b => (b.STATUS || '').toUpperCase() === st.dbKey)
    const count = dbItem ? parseInt(dbItem.count || 0) : 0
    const ratio = totalCount > 0 ? (count / totalCount) : 0
    return {
      name: st.name,
      color: st.color,
      count,
      ratio,
      percentage: Math.round(ratio * 100)
    }
  })
})

// Fetch active offices for dropdown
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
    console.error('Fetch offices dropdown failed:', error)
  }
}

// Fetch stats and refresh UI
const fetchDashboardData = async () => {
  try {
    const response = await api.get('/penyaluran/dashboard-stats', {
      params: {
        office: filters.office === '0' ? undefined : filters.office,
        year: filters.year,
        month: filters.month === 'all' ? undefined : filters.month
      }
    })
    
    stats.value = response.data
    
    // Update map points
    nextTick(() => {
      renderMapPoints(response.data.mapData || [])
    })
  } catch (error) {
    console.error('Fetch dashboard data failed:', error)
  }
}

// Initialize Leaflet Map
const initMap = () => {
  if (mapInstance) return

  // Default coordinate centered in Indonesia
  mapInstance = L.map('mustahik-map').setView([-2.5489, 118.0149], 5)

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

  // Filter points based on active program/sub-program/sdgs filter
  let filteredPoints = points
  if (mapFilter.value) {
    const filterVal = mapFilter.value
    filteredPoints = points.filter(pt => {
      if (filterType.value === 'sub_program') {
        return pt.sub_programs && pt.sub_programs.includes(filterVal)
      } else if (filterType.value === 'detail_program') {
        return pt.detail_programs && pt.detail_programs.includes(filterVal)
      } else if (filterType.value === 'sdgs') {
        return pt.sdgs && pt.sdgs.includes(filterVal)
      }
      return true
    })
  }

  // Filter points based on active grouping category filter (Tipe, Sifat, Asnaf, Tipe Penyaluran)
  if (groupingMapFilter.value) {
    const filterVal = groupingMapFilter.value
    filteredPoints = filteredPoints.filter(pt => {
      if (groupingTab.value === 'tipe') {
        return (pt.tipe || '').toUpperCase() === filterVal.toUpperCase()
      } else if (groupingTab.value === 'umum_khusus') {
        return (pt.umum_khusus || '').toUpperCase() === filterVal.toUpperCase()
      } else if (groupingTab.value === 'asnaf') {
        return (pt.asnaf || '').toUpperCase() === filterVal.toUpperCase()
      } else if (groupingTab.value === 'tipe_penyaluran') {
        return (pt.tipe_penyaluran || '').toUpperCase() === filterVal.toUpperCase()
      }
      return true
    })
  }

  if (filteredPoints.length === 0) return

  const bounds = L.latLngBounds()

  filteredPoints.forEach(pt => {
    if (!pt.lat || !pt.lng) return

    // Define color based on status
    let markerColor = '#2196f3' // default blue
    if (pt.status === 'FINISH') markerColor = '#009688' // teal
    else if (pt.status === 'PROSES PENCAIRAN') markerColor = '#ff9800' // orange
    else if (pt.status === 'DITOLAK') markerColor = '#f44336' // red

    const customIcon = L.divIcon({
      html: `<div class="map-pin" style="background-color: ${markerColor};"></div>`,
      className: 'custom-leaflet-pin',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })

    const marker = L.marker([pt.lat, pt.lng], { icon: customIcon })
    
    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-title font-outfit">${pt.name}</div>
        <div class="popup-info"><b>Asnaf:</b> ${pt.asnaf || 'Umum'}</div>
        <div class="popup-info"><b>Tipe/Sifat:</b> ${pt.tipe || ''} / ${pt.umum_khusus || ''}</div>
        <div class="popup-info"><b>Penyaluran:</b> ${pt.tipe_penyaluran || ''}</div>
        <div class="popup-info"><b>Kota/Prov:</b> ${pt.kab || ''}, ${pt.prov || ''}</div>
        <div class="popup-info"><b>Status:</b> <span class="popup-badge status-${pt.status.toLowerCase().replace(' ', '-')}">${pt.status}</span></div>
        <div class="popup-amount text-bold">${formatRupiah(pt.amount)}</div>
      </div>
    `
    marker.bindPopup(popupContent)
    markerGroup.addLayer(marker)
    bounds.extend([pt.lat, pt.lng])
  })

  // Fit bounds if there are markers, with padding
  if (filteredPoints.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
  }
}

onMounted(async () => {
  await fetchOffices()
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
.border-accordion {
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  .body--dark & {
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.border-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.02) !important;
}

.metric-card {
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px 0 rgba(0, 0, 0, 0.05) !important;
  }
}

.card-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.chart-card, .map-card, .program-card {
  min-height: 380px;
}

/* SVG Bar styling & hover animation */
.svg-bar {
  transition: all 0.3s ease;
  cursor: pointer;
  &:hover {
    opacity: 0.85;
    fill: #29b6f6;
  }
}

/* Leaflet map styling */
.map-container {
  height: 320px;
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1;
}

/* Custom CSS Pin Icon */
.map-pin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  animation: pulse-pin 2s infinite alternate;
}

@keyframes pulse-pin {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
  100% { transform: scale(1.1); box-shadow: 0 0 8px 3px rgba(33, 150, 243, 0.2); }
}

/* Popup style */
.map-popup-card {
  font-family: 'Inter', sans-serif;
  color: #333;
  padding: 4px;
  .popup-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #1565c0;
  }
  .popup-info {
    font-size: 11px;
    margin-bottom: 3px;
  }
  .popup-amount {
    margin-top: 6px;
    font-size: 13px;
    color: #2e7d32;
  }
  .popup-badge {
    font-size: 9px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
}

.status-finish { background-color: #e0f2f1; color: #00796b; }
.status-proses-pencairan { background-color: #fff3e0; color: #e65100; }
.status-diterima { background-color: #e8eaf6; color: #1a237e; }
.status-open { background-color: #e3f2fd; color: #0d47a1; }
.status-masuk { background-color: #f5f5f5; color: #616161; }
.status-ditolak { background-color: #ffe5e5; color: #c62828; }

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

.nav-item-breakdown {
  transition: all 0.2s ease;
  &:hover {
    background-color: rgba(33, 150, 243, 0.05);
  }
}

.hover-elevation {
  transition: all 0.25s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.04) !important;
    border-color: rgba(0, 150, 136, 0.2) !important;
  }
}
</style>
