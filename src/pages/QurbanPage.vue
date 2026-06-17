<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Laporan Distribusi Qurban</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Manajemen titik salur qurban, status pemotongan, dan dokumentasi foto</p>
      </div>
    </div>

    <!-- Filter & Table Card -->
    <q-card class="bg-white q-pa-md border-card relative-position">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-3">
          <q-input
            v-model="filters.donatur"
            label="Cari Nama Donatur"
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          />
        </div>
        <div class="col-6 col-sm-2">
          <q-select
            v-model="filters.year"
            :options="yearOptions"
            label="Tahun"
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          />
        </div>
        <div class="col-6 col-sm-2">
          <q-select
            v-model="filters.status"
            :options="['OPEN', 'TERDISTRIBUSI', 'TERPOTONG', 'VERIFIKASI', 'FINISH']"
            label="Status"
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          />
        </div>
        <div class="col-6 col-sm-2">
          <q-select
            v-model="filters.office"
            :options="officeOptions"
            option-label="kantor"
            option-value="officeid"
            label="Kantor"
            outlined
            dense
            clearable
            emit-value
            map-options
            @update:model-value="resetPageAndFetch"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="filters.pointId"
            :options="distPointsOptions"
            option-label="wilayahdistribusi"
            option-value="id"
            label="Titik Distribusi"
            outlined
            dense
            clearable
            emit-value
            map-options
            @update:model-value="resetPageAndFetch"
          />
        </div>
      </div>

      <!-- Selection Table for Bulk Actions -->
      <q-table
        :rows="qurbanList"
        :columns="columns"
        row-key="detail_id"
        selection="multiple"
        v-model:selected="selectedRows"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onTableRequest"
        binary-state-sort
        flat
        bordered
        class="qurban-table rounded-borders"
        :grid="$q.screen.xs"
      >
        <!-- Grid item for mobile view -->
        <template v-slot:item="props">
          <div class="q-pa-xs col-12 col-sm-6">
            <q-card class="bg-white border-card q-pa-sm" :class="{ 'bg-orange-1 border-orange': props.selected }">
              <q-card-section class="q-pb-xs q-pt-sm">
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center q-gutter-sm">
                    <q-checkbox v-model="props.selected" color="orange-9" dense v-if="props.row.status === 'TERDISTRIBUSI'" />
                    <div style="width: 32px;" v-else></div>
                    <div>
                      <div class="text-subtitle2 text-weight-bold text-dark ellipsis">{{ props.row.donatur || 'Hamba Allah' }}</div>
                      <div class="text-caption text-grey-5">{{ props.row.detail_id }}</div>
                    </div>
                  </div>
                  <q-badge :color="getStatusColor(props.row.status)" class="q-py-xs q-px-sm text-bold">
                    {{ props.row.status }}
                  </q-badge>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section class="q-py-sm">
                <div class="text-caption text-orange-9 text-bold">
                  Produk: {{ props.row.produk }}
                </div>
                <div class="text-caption text-grey-7">
                  Jumlah: {{ props.row.qty }} Ekor
                </div>
                <div class="text-caption text-grey-7" v-if="props.row.keterangan">
                  Keterangan: {{ props.row.keterangan }}
                </div>
                <div class="text-caption text-grey-8 q-mt-xs">
                  <b>Titik Salur:</b> {{ props.row.point_name || 'Belum ditetapkan' }}
                </div>
                <div class="text-caption text-grey-6" v-if="props.row.prov || props.row.kab || props.row.kec || props.row.kel">
                  Lokasi: {{ [props.row.kel, props.row.kec, props.row.kab, props.row.prov].filter(Boolean).join(', ') }}
                </div>
                <div class="text-caption text-grey-6" v-if="props.row.user_pj">
                  PJ: {{ props.row.user_pj }}
                </div>
              </q-card-section>
              <q-separator />
              <q-card-actions align="right" class="q-py-xs">
                <q-btn flat round color="primary" icon="assignment" size="sm" @click="openEditDialog(props.row)">
                  <q-tooltip>{{ isLocked(props.row) ? 'Lihat Detail (Terkunci)' : 'Proses & Upload Foto' }}</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <!-- Custom Row Selection Checkbox -->
        <template v-slot:body-selection="scope">
          <q-checkbox 
            v-model="scope.selected" 
            color="orange-9" 
            v-if="scope.row.status === 'TERDISTRIBUSI'" 
          />
        </template>

        <template v-slot:body-cell-donatur="props">
          <q-td :props="props">
            <!-- Nama Donatur & ID -->
            <div class="text-weight-bold text-dark">{{ props.row.donatur || 'Hamba Allah' }}</div>
            <div class="text-caption text-grey-6">ID: {{ props.row.detail_id }}</div>
            
            <!-- Hewan Qurban -->
            <div class="text-caption text-orange-9 text-bold q-mt-xs">
              {{ props.row.produk }} ({{ props.row.qty }} Ekor)
            </div>
            
            <!-- Keterangan -->
            <div class="text-caption text-grey-7" v-if="props.row.keterangan" style="max-width: 250px; white-space: normal; word-break: break-word;">
              Ket: {{ props.row.keterangan }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-point_name="props">
          <q-td :props="props">
            <div style="white-space: normal; word-break: break-word;">
              <div class="text-dark text-bold" v-if="props.row.point_name">{{ props.row.point_name }}</div>
              <div class="text-grey-5 italic" v-else>Belum ditetapkan</div>
              <div class="text-caption text-grey-5 font-italic" v-if="props.row.prov || props.row.kab || props.row.kec || props.row.kel">
                {{ [props.row.kel, props.row.kec, props.row.kab, props.row.prov].filter(Boolean).join(', ') }}
              </div>
              <div class="text-caption text-grey-6" v-if="props.row.user_pj">PJ: {{ props.row.user_pj }}</div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" align="center">
            <q-badge :color="getStatusColor(props.row.status)" class="q-py-xs q-px-sm text-bold">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-action="props">
          <q-td :props="props" align="center" class="q-gutter-xs">
            <!-- Edit / Process button -->
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="assignment"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>{{ isLocked(props.row) ? 'Lihat Detail (Terkunci)' : 'Proses & Upload Foto' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <!-- Bulk Action Floating Bar -->
      <div v-if="selectedRows.length > 0" class="bulk-floating-bar bg-dark text-white q-pa-md row items-center justify-between rounded-borders shadow-8">
        <div>
          Terpilih <b>{{ selectedRows.length }}</b> item qurban.
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            color="orange-9"
            icon="content_cut"
            label="Set Status TERPOTONG Massal"
            no-caps
            class="text-bold"
            @click="bulkSetPotong"
          />
          <q-btn
            flat
            color="white"
            label="Batal"
            no-caps
            @click="selectedRows = []"
          />
        </div>
      </div>
    </q-card>

    <!-- Process & Upload Photos Dialog -->
    <q-dialog v-model="editDialog.open" persistent>
      <q-card style="width: 750px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center bg-orange-9 text-white q-py-sm">
          <div class="text-h6 text-bold">Proses Distribusi Qurban</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="scroll" style="max-height: 70vh;">
          <!-- Lock status alert -->
          <q-alert v-if="isLocked(editDialog.data)" type="warning" class="q-mb-md rounded-borders" bg-color="amber-1" text-color="amber-9">
            <q-icon name="lock" class="q-mr-xs" />
            Laporan ini sudah berstatus FINISH dan terkunci dari perubahan.
          </q-alert>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">Donatur</div>
              <div class="text-subtitle1 text-weight-bold text-dark">{{ editDialog.data.donatur || 'Hamba Allah' }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">Produk Qurban</div>
              <div class="text-subtitle1 text-weight-bold text-orange-9">{{ editDialog.data.produk }} (x{{ editDialog.data.qty }} Ekor)</div>
            </div>
          </div>

          <!-- Edit inputs (Hidden or disabled if locked) -->
          <div class="row q-col-gutter-sm">
            <!-- Distribution Point selection -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.distribusi"
                :options="filteredDistPointsOptions"
                option-label="wilayahdistribusi"
                option-value="id"
                label="Pilih Titik Distribusi *"
                outlined
                dense
                emit-value
                map-options
                use-input
                input-debounce="0"
                @filter="filterDistPoints"
                :disable="isLocked(editDialog.data) || !canEditPoint"
                @update:model-value="onDistPointChange"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps" class="q-py-sm">
                    <q-item-section>
                      <div class="row items-center justify-between no-wrap q-mb-xs">
                        <q-item-label class="text-weight-bold">{{ scope.opt.wilayahdistribusi }}</q-item-label>
                        <q-chip
                          size="xs"
                          dense
                          :color="getProgressColor(scope.opt.tersedia, scope.opt.quota)"
                          text-color="white"
                          class="text-bold"
                        >
                          Tersedia: {{ scope.opt.tersedia || 0 }} / {{ scope.opt.quota || 0 }}
                        </q-chip>
                      </div>
                      <q-item-label caption class="text-grey-6 q-mb-xs" style="font-size: 11px;">
                        {{ [scope.opt.kel, scope.opt.kec, scope.opt.kab, scope.opt.prov].filter(Boolean).join(', ') }}
                      </q-item-label>
                      <q-linear-progress
                        :value="scope.opt.quota ? (scope.opt.tersedia || 0) / scope.opt.quota : 0"
                        :color="getProgressColor(scope.opt.tersedia, scope.opt.quota)"
                        track-color="grey-3"
                        class="rounded-borders"
                        style="height: 6px;"
                      />
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <!-- PJ Field showing PIC -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.pic_lapangan"
                label="PIC Lapangan / PJ"
                outlined
                dense
                readonly
                bg-color="grey-2"
                hint="Ditentukan otomatis oleh titik distribusi"
              />
            </div>

            <!-- Lokasi & Quota Preview -->
            <div class="col-12" v-if="selectedPoint">
              <q-card flat bordered class="q-pa-sm bg-grey-1 rounded-borders">
                <div class="row items-center justify-between no-wrap q-mb-xs">
                  <div class="text-caption text-grey-8 text-bold">
                    Lokasi: <span class="text-dark text-weight-regular">{{ selectedPointAddress }}</span>
                  </div>
                  <div class="text-caption text-weight-bold" :class="`text-${getProgressColor(selectedPoint.tersedia, selectedPoint.quota)}`">
                    Tersedia: {{ selectedPoint.tersedia || 0 }} / {{ selectedPoint.quota || 0 }} ({{ selectedPoint.quota ? Math.round(((selectedPoint.tersedia || 0) / selectedPoint.quota) * 100) : 0 }}%)
                  </div>
                </div>
                <q-linear-progress
                  :value="selectedPoint.quota ? (selectedPoint.tersedia || 0) / selectedPoint.quota : 0"
                  :color="getProgressColor(selectedPoint.tersedia, selectedPoint.quota)"
                  track-color="grey-3"
                  class="rounded-borders"
                  style="height: 8px;"
                />
              </q-card>
            </div>

            <!-- Keterangan / Pequrban -->
            <div class="col-12">
              <q-input
                v-model="form.keterangan"
                label="Keterangan / Nama Pequrban"
                outlined
                dense
                :disable="isLocked(editDialog.data)"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.status"
                :options="['OPEN', 'TERDISTRIBUSI', 'TERPOTONG', 'VERIFIKASI', 'FINISH']"
                label="Status Transaksi"
                outlined
                dense
                :disable="isLocked(editDialog.data) || !isPJOrAdmin"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.alasan"
                label="Alasan Perubahan Status / Notes"
                outlined
                dense
                :disable="isLocked(editDialog.data) || !isPJOrAdmin"
              />
            </div>

            <q-separator class="col-12 q-my-md" />

            <!-- Photo Upload Area -->
            <div class="col-12">
              <div class="text-subtitle2 text-bold text-dark q-mb-xs font-outfit">Dokumentasi Foto Hewan Qurban (VERIFIKASI)</div>
              <p class="text-caption text-grey-7">Status akan otomatis berubah ke <b>VERIFIKASI</b> jika Foto 1 dan Foto 2 berhasil diupload.</p>
              
              <div class="row q-col-gutter-md">
                <!-- Foto 1 -->
                <div class="col-12 col-sm-4 text-center">
                  <div class="text-caption text-bold text-grey-8 q-mb-xs">Foto 1 (Sebelum Potong)</div>
                  <q-img
                    :src="getPhotoUrl(form.url_foto1)"
                    style="height: 120px; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa;"
                    fit="contain"
                    class="q-mb-sm cursor-pointer"
                    @click="openZoomImage(form.url_foto1, 'Foto 1 (Sebelum Potong)')"
                  >
                    <q-tooltip v-if="form.url_foto1">Klik untuk memperbesar</q-tooltip>
                    <template v-slot:error>
                      <div class="absolute-full flex flex-center bg-grey-3 text-grey-6 text-caption">Belum Ada Foto</div>
                    </template>
                  </q-img>
                  
                  <q-file
                    v-model="files.foto1"
                    label="Pilih Foto 1"
                    outlined
                    dense
                    accept="image/*"
                    :disable="isLocked(editDialog.data) || !isPJOrAdmin"
                    @update:model-value="uploadSinglePhoto('foto1')"
                    class="upload-picker"
                  >
                    <template v-slot:prepend><q-icon name="cloud_upload" /></template>
                  </q-file>
                </div>

                <!-- Foto 2 -->
                <div class="col-12 col-sm-4 text-center">
                  <div class="text-caption text-bold text-grey-8 q-mb-xs">Foto 2 (Proses Potong)</div>
                  <q-img
                    :src="getPhotoUrl(form.url_foto2)"
                    style="height: 120px; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa;"
                    fit="contain"
                    class="q-mb-sm cursor-pointer"
                    @click="openZoomImage(form.url_foto2, 'Foto 2 (Proses Potong)')"
                  >
                    <q-tooltip v-if="form.url_foto2">Klik untuk memperbesar</q-tooltip>
                    <template v-slot:error>
                      <div class="absolute-full flex flex-center bg-grey-3 text-grey-6 text-caption">Belum Ada Foto</div>
                    </template>
                  </q-img>
                  
                  <q-file
                    v-model="files.foto2"
                    label="Pilih Foto 2"
                    outlined
                    dense
                    accept="image/*"
                    :disable="isLocked(editDialog.data) || !isPJOrAdmin"
                    @update:model-value="uploadSinglePhoto('foto2')"
                    class="upload-picker"
                  >
                    <template v-slot:prepend><q-icon name="cloud_upload" /></template>
                  </q-file>
                </div>

                <!-- Foto 3 -->
                <div class="col-12 col-sm-4 text-center">
                  <div class="text-caption text-bold text-grey-8 q-mb-xs">Foto 3 (Terdistribusi)</div>
                  <q-img
                    :src="getPhotoUrl(form.url_foto3)"
                    style="height: 120px; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa;"
                    fit="contain"
                    class="q-mb-sm cursor-pointer"
                    @click="openZoomImage(form.url_foto3, 'Foto 3 (Terdistribusi)')"
                  >
                    <q-tooltip v-if="form.url_foto3">Klik untuk memperbesar</q-tooltip>
                    <template v-slot:error>
                      <div class="absolute-full flex flex-center bg-grey-3 text-grey-6 text-caption">Belum Ada Foto</div>
                    </template>
                  </q-img>
                  
                  <q-file
                    v-model="files.foto3"
                    label="Pilih Foto 3"
                    outlined
                    dense
                    accept="image/*"
                    :disable="isLocked(editDialog.data) || !isPJOrAdmin"
                    @update:model-value="uploadSinglePhoto('foto3')"
                    class="upload-picker"
                  >
                    <template v-slot:prepend><q-icon name="cloud_upload" /></template>
                  </q-file>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Tutup" color="grey-7" v-close-popup no-caps />
          <q-btn
            v-if="!isLocked(editDialog.data)"
            label="Simpan Data"
            color="orange-9"
            class="q-px-lg text-bold"
            no-caps
            @click="saveQurban"
            :disable="!isPJOrAdmin && !canEditPoint"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Image Zoom Dialog -->
    <q-dialog v-model="zoomImage.open">
      <q-card style="min-width: 350px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-bold">{{ zoomImage.title }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md text-center">
          <img :src="zoomImage.url" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px;" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import { Notify, Dialog, Loading } from 'quasar'

const authStore = useAuthStore()

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const filters = reactive({
  donatur: '',
  status: null,
  office: authStore.user?.office || null,
  pointId: null,
  year: new Date().getFullYear()
})

const loading = ref(false)
const qurbanList = ref([])
const officeOptions = ref([])
const distPointsOptions = ref([])
const dialogDistPointsOptions = ref([])
const filteredDistPointsOptions = ref([])
const selectedRows = ref([])

const pagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'donatur', label: 'Donatur & Qurban', align: 'left', sortable: true },
  { name: 'point_name', label: 'Titik Distribusi', align: 'left' },
  { name: 'status', label: 'Status Laporan', align: 'center', sortable: true },
  { name: 'action', label: 'Proses', align: 'center' }
]

// Modal edit state
const editDialog = reactive({
  open: false,
  data: null
})

// Zoom image state
const zoomImage = reactive({
  open: false,
  url: '',
  title: ''
})

const openZoomImage = (url, title) => {
  if (!url) return
  zoomImage.url = getPhotoUrl(url)
  zoomImage.title = title
  zoomImage.open = true
}

const form = reactive({
  distribusi: null,
  pic_lapangan: '',
  status: 'OPEN',
  notes: '',
  keterangan: '',
  foto1: '',
  foto2: '',
  foto3: '',
  url_foto1: '',
  url_foto2: '',
  url_foto3: '',
  alasan: ''
})

const files = reactive({
  foto1: null,
  foto2: null,
  foto3: null
})

// Permissions computed helpers
const isLocked = (row) => {
  return row?.status === 'FINISH'
}

// User can edit the distribution point if the record belongs to their office
const canEditPoint = computed(() => {
  if (authStore.isAdmin) return true
  const userOff = authStore.user?.office || ''
  const qurbanOff = editDialog.data?.office || ''
  return qurbanOff.startsWith(userOff)
})

// User is the assigned PIC or Admin
const isPJOrAdmin = computed(() => {
  if (authStore.isAdmin) return true
  return editDialog.data?.user_pj === authStore.user?.login
})

// Selected point address detail
const selectedPointAddress = computed(() => {
  if (!form.distribusi) return ''
  const point = dialogDistPointsOptions.value.find(p => p.id === form.distribusi)
  if (!point) return ''
  return [point.kel, point.kec, point.kab, point.prov].filter(Boolean).join(', ')
})

const selectedPoint = computed(() => {
  if (!form.distribusi) return null
  return dialogDistPointsOptions.value.find(p => p.id === form.distribusi) || null
})

const getStatusColor = (status) => {
  switch (status) {
    case 'FINISH': return 'teal-8'
    case 'VERIFIKASI': return 'indigo-8'
    case 'TERPOTONG': return 'orange-8'
    case 'TERDISTRIBUSI': return 'blue-8'
    case 'OPEN': return 'grey-8'
    default: return 'grey-6'
  }
}

const getProgressColor = (tersedia, quota) => {
  if (!quota || quota <= 0) return 'negative'
  const ratio = (tersedia || 0) / quota
  if (ratio <= 0.2) return 'negative'     // Level 1: 0% - 20% (Critical)
  if (ratio <= 0.4) return 'orange-8'     // Level 2: 21% - 40% (Low)
  if (ratio <= 0.6) return 'amber-8'      // Level 3: 41% - 60% (Medium)
  if (ratio <= 0.8) return 'blue-7'       // Level 4: 61% - 80% (Good)
  return 'positive'                       // Level 5: 81% - 100% (Very Good)
}



const getPhotoUrl = (url) => {
  if (!url) return ''
  // If it's a relative local upload path, prepend the server URL
  if (url.startsWith('/uploads/')) {
    return `http://localhost:3000${url}`
  }
  return url
}

// Fetch active offices
const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
  } catch (error) {
    console.error('Fetch offices dropdown failed:', error)
  }
}

// Fetch active distribution points
const fetchDistPoints = async (year) => {
  try {
    const response = await api.get('/qurban/distribution-points', {
      params: { year: year || undefined }
    })
    distPointsOptions.value = response.data
  } catch (error) {
    console.error('Fetch distribution points failed:', error)
  }
}

// Filter distribution points based on user search input
const filterDistPoints = (val, update) => {
  if (val === '') {
    update(() => {
      filteredDistPointsOptions.value = dialogDistPointsOptions.value.filter(v => (v.tersedia > 0 || v.id === form.distribusi))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredDistPointsOptions.value = dialogDistPointsOptions.value.filter(v => {
      const isAvailableOrSelected = (v.tersedia > 0 || v.id === form.distribusi)
      if (!isAvailableOrSelected) return false

      const matchName = (v.wilayahdistribusi || '').toLowerCase().indexOf(needle) > -1
      const matchProv = (v.prov || '').toLowerCase().indexOf(needle) > -1
      const matchKab = (v.kab || '').toLowerCase().indexOf(needle) > -1
      const matchKec = (v.kec || '').toLowerCase().indexOf(needle) > -1
      const matchKel = (v.kel || '').toLowerCase().indexOf(needle) > -1
      return matchName || matchProv || matchKab || matchKec || matchKel
    })
  })
}

// Fetch main Qurban listing
const fetchQurbanList = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/qurban', {
      params: {
        donatur: filters.donatur || undefined,
        status: filters.status || undefined,
        office: filters.office || undefined,
        pointId: filters.pointId || undefined,
        year: filters.year || undefined,
        page,
        limit
      }
    })

    qurbanList.value = response.data.data
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit
  } catch (error) {
    console.error('Fetch qurban list failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal memuat data qurban' })
  } finally {
    loading.value = false
  }
}

const resetPageAndFetch = async () => {
  pagination.value.page = 1
  await fetchDistPoints(filters.year)
  await fetchQurbanList(1, pagination.value.rowsPerPage)
}

const onTableRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  fetchQurbanList(page, rowsPerPage)
}

// Bulk update to TERPOTONG status
const bulkSetPotong = () => {
  // Check if any selected row is not TERDISTRIBUSI
  const invalidRows = selectedRows.value.filter(row => row.status !== 'TERDISTRIBUSI')
  if (invalidRows.length > 0) {
    Notify.create({
      type: 'negative',
      message: 'Pemotongan massal hanya diperbolehkan untuk hewan yang berstatus TERDISTRIBUSI!'
    })
    return
  }

  const ids = selectedRows.value.map(row => row.detail_id)
  Dialog.create({
    title: 'Konfirmasi Pemotongan Massal',
    message: `Apakah Anda yakin ingin menandai ${ids.length} hewan qurban sebagai TERPOTONG secara massal?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.post('/qurban/bulk-potong', { detailIds: ids })
      Notify.create({ type: 'positive', message: 'Hewan qurban massal ditandai sebagai TERPOTONG' })
      selectedRows.value = []
      fetchQurbanList(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah status massal'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

// Open Single Edit/Upload Dialog
const openEditDialog = async (row) => {
  editDialog.data = row
  editDialog.open = true

  form.distribusi = row.distribusi
  form.pic_lapangan = row.user_pj || row.pic_lapangan || ''
  form.status = row.status || 'OPEN'
  form.notes = row.notes || ''
  form.keterangan = row.keterangan || ''
  form.foto1 = row.foto1 || ''
  form.foto2 = row.foto2 || ''
  form.foto3 = row.foto3 || ''
  form.url_foto1 = row.url_foto1 || ''
  form.url_foto2 = row.url_foto2 || ''
  form.url_foto3 = row.url_foto3 || ''
  form.alasan = row.alasan || ''

  // Reset file pickers
  files.foto1 = null
  files.foto2 = null
  files.foto3 = null

  // Fetch points specifically for this transaction's year
  const transYear = row.tgl ? new Date(row.tgl).getFullYear() : filters.year
  try {
    const response = await api.get('/qurban/distribution-points', {
      params: { year: transYear }
    })
    dialogDistPointsOptions.value = response.data
    filteredDistPointsOptions.value = response.data.filter(v => (v.tersedia > 0 || v.id === row.distribusi))
    
    // Set pic_lapangan from the newly fetched points if not set
    if (!form.pic_lapangan && form.distribusi) {
      const found = response.data.find(p => p.id === form.distribusi)
      if (found) {
        form.pic_lapangan = found.user_pj || ''
      }
    }
  } catch (err) {
    console.error('Failed to fetch distribution points for transaction year:', err)
  }
}

const onDistPointChange = (val) => {
  if (!val) {
    form.pic_lapangan = ''
    return
  }
  const found = dialogDistPointsOptions.value.find(p => p.id === val)
  if (found) {
    form.pic_lapangan = found.user_pj || ''
  }
}

// Upload a single photo on-the-fly when selected
const uploadSinglePhoto = async (fieldName) => {
  const fileToUpload = files[fieldName]
  if (!fileToUpload) return

  Loading.show({ message: `Mengunggah ${fieldName}...` })

  const formData = new FormData()
  formData.append(fieldName, fileToUpload)

  try {
    const response = await api.post(`/qurban/${editDialog.data.detail_id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    // Update local form state with uploaded url
    const urls = response.data.urls
    if (urls.url_foto1) form.url_foto1 = urls.url_foto1
    if (urls.url_foto2) form.url_foto2 = urls.url_foto2
    if (urls.url_foto3) form.url_foto3 = urls.url_foto3
    
    // Update status to VERIFIKASI automatically if returned
    if (response.data.status) {
      form.status = response.data.status
    }

    Notify.create({ type: 'positive', message: `${fieldName} berhasil diunggah` })
    
    // Refresh parent record metadata
    editDialog.data.url_foto1 = form.url_foto1
    editDialog.data.url_foto2 = form.url_foto2
    editDialog.data.url_foto3 = form.url_foto3
    editDialog.data.status = form.status

  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal mengunggah foto'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    Loading.hide()
  }
}

// Save single edited qurban record
const saveQurban = async () => {
  if (form.status === 'TERPOTONG' && editDialog.data.status !== 'TERDISTRIBUSI' && editDialog.data.status !== 'TERPOTONG') {
    Notify.create({
      type: 'negative',
      message: 'Perubahan status ke TERPOTONG hanya bisa dilakukan jika status awal adalah TERDISTRIBUSI!'
    })
    return
  }
  try {
    await api.put(`/qurban/${editDialog.data.detail_id}`, form)
    Notify.create({ type: 'positive', message: 'Data qurban berhasil disimpan' })
    editDialog.open = false
    fetchQurbanList(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menyimpan data qurban'
    Notify.create({ type: 'negative', message: msg })
  }
}

onMounted(async () => {
  await fetchOffices()
  await fetchDistPoints(filters.year)
  await fetchQurbanList(1, 10)
})
</script>

<style lang="scss">
.qurban-table {
  .q-table__thead {
    background-color: #fafafa;
    color: #424242;
    font-weight: bold;
  }
}

.border-orange {
  border: 1px solid #ff5722 !important;
}

/* Floating Bulk Bar style */
.bulk-floating-bar {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 99;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.upload-picker {
  max-width: 100%;
}
</style>
