<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Pengaturan Titik Qurban</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Kelola wilayah distribusi, kuota hewan, dan penanggung jawab lapangan</p>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          color="teal-8"
          icon="map"
          label="Lihat Peta Sebaran"
          class="rounded-borders text-bold q-py-sm"
          no-caps
          @click="openMapDialog"
        />
        <q-btn
          color="orange-9"
          icon="add"
          label="Tambah Titik Distribusi"
          class="rounded-borders text-bold q-py-sm"
          no-caps
          @click="openAddDialog"
        />
      </div>
    </div>

    <!-- Main Table Card -->
    <q-card class="bg-white q-pa-md border-card relative-position">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="search"
            label="Cari wilayah, provinsi, kota, atau PJ..."
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-2">
          <q-select
            v-model="selectedYear"
            :options="yearOptions"
            label="Tahun"
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          />
        </div>
      </div>

      <q-table
        :rows="items"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onTableRequest"
        binary-state-sort
        flat
        bordered
        class="qurban-table rounded-borders"
        :grid="$q.screen.xs"
      >
        <!-- Custom status column -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props" align="center">
            <q-badge :color="props.row.status === 'ON' ? 'positive' : 'negative'" class="q-py-xs q-px-sm text-bold">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>

        <!-- Custom wilayahdistribusi column -->
        <template v-slot:body-cell-wilayahdistribusi="props">
          <q-td :props="props">
            <div style="white-space: normal; word-break: break-word;">
              <div class="text-weight-bold text-dark">{{ props.row.wilayahdistribusi }}</div>
              <div class="text-caption text-grey-6">
                {{ [props.row.kel, props.row.kec, props.row.kab, props.row.prov].filter(Boolean).join(', ') || '-' }}
              </div>
            </div>
          </q-td>
        </template>

        <!-- Custom quota column -->
        <template v-slot:body-cell-quota="props">
          <q-td :props="props" align="left" style="min-width: 160px;">
            <div class="q-mb-xs row items-center justify-between no-wrap">
              <span class="text-caption text-grey-7">Tersedia: <b>{{ props.row.tersedia || 0 }}</b> / {{ props.row.quota || 0 }}</span>
              <span class="text-caption text-weight-bold" :class="`text-${getProgressColor(props.row.tersedia, props.row.quota)}`">
                {{ props.row.quota ? Math.round(((props.row.tersedia || 0) / props.row.quota) * 100) : 0 }}%
              </span>
            </div>
            <q-linear-progress
              :value="props.row.quota ? (props.row.tersedia || 0) / props.row.quota : 0"
              :color="getProgressColor(props.row.tersedia, props.row.quota)"
              track-color="grey-3"
              class="rounded-borders"
              style="height: 8px;"
            />
          </q-td>
        </template>

        <!-- Custom actions column -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" align="center" class="q-gutter-xs">
            <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog(props.row)">
              <q-tooltip>Edit Data</q-tooltip>
            </q-btn>
            <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(props.row)">
              <q-tooltip>Hapus Data</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="dialog.open" persistent>
      <q-card style="width: 650px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center bg-orange-9 text-white q-py-sm">
          <div class="text-h6 text-bold">{{ dialog.isEdit ? 'Edit Titik Distribusi' : 'Tambah Titik Distribusi' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="scroll" style="max-height: 70vh;">
          <q-form ref="formRef" class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.id"
                label="ID Titik"
                outlined
                dense
                :readonly="dialog.isEdit"
                :bg-color="dialog.isEdit ? 'grey-2' : ''"
                :hint="dialog.isEdit ? '' : 'Dibuat otomatis jika kosong'"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.office"
                :options="officeOptions"
                option-label="kantor"
                option-value="officeid"
                label="Kantor BMH *"
                outlined
                dense
                emit-value
                map-options
                clearable
                :rules="[val => !!val || 'Kantor wajib dipilih']"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.wilayahdistribusi"
                label="Nama Titik Distribusi *"
                outlined
                dense
                type="textarea"
                rows="3"
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.pm"
                label="Calon Penerima Manfaat"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.user_pj"
                :options="options.users"
                option-label="login"
                option-value="login"
                label="Username PJ Lapangan *"
                outlined
                dense
                use-input
                input-debounce="300"
                @filter="filterUsers"
                emit-value
                map-options
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.login }}</q-item-label>
                      <q-item-label caption class="text-grey-6">{{ scope.opt.name }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.status"
                :options="['ON', 'OFF']"
                label="Status Aktif *"
                outlined
                dense
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.quota"
                type="number"
                label="Quota Hewan *"
                outlined
                dense
                :rules="[val => val !== null && val >= 0 || 'Quota tidak boleh negatif']"
                @update:model-value="onQuotaChange"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.tersedia"
                type="number"
                label="Tersedia *"
                outlined
                dense
                readonly
                bg-color="grey-2"
                hint="Kolom otomatis (Quota Baru - Quota Lama)"
                :rules="[val => val !== null && val >= 0 || 'Tersedia tidak boleh negatif']"
              />
            </div>

            <!-- Address fields -->
            <q-separator class="col-12 q-my-md" />
            <div class="col-12 text-subtitle2 text-bold text-dark q-mb-xs">Lokasi Wilayah (Pencarian Bertingkat)</div>
            
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.prov"
                :options="options.prov"
                label="Provinsi *"
                outlined
                dense
                use-input
                input-debounce="300"
                @filter="filterProv"
                @update:model-value="onProvChange"
                new-value-mode="add-unique"
                @input-value="val => { if (val) form.prov = val }"
                :rules="[val => !!val || 'Provinsi wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.kab"
                :options="options.kab"
                label="Kabupaten / Kota *"
                outlined
                dense
                use-input
                input-debounce="300"
                @filter="filterKab"
                @update:model-value="onKabChange"
                :disable="!form.prov"
                new-value-mode="add-unique"
                @input-value="val => { if (val) form.kab = val }"
                :rules="[val => !!val || 'Kabupaten / Kota wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.kec"
                :options="options.kec"
                label="Kecamatan *"
                outlined
                dense
                use-input
                input-debounce="300"
                @filter="filterKec"
                @update:model-value="onKecChange"
                :disable="!form.kab"
                new-value-mode="add-unique"
                @input-value="val => { if (val) form.kec = val }"
                :rules="[val => !!val || 'Kecamatan wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.kel"
                :options="options.kel"
                label="Kelurahan / Desa *"
                outlined
                dense
                use-input
                input-debounce="300"
                @filter="filterKel"
                :disable="!form.kec"
                new-value-mode="add-unique"
                @input-value="val => { if (val) form.kel = val }"
                :rules="[val => !!val || 'Kelurahan / Desa wajib diisi']"
              />
            </div>

            <!-- End of address fields -->
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
          <q-btn label="Simpan" color="orange-9" class="q-px-lg text-bold" no-caps @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Map Dialog -->
    <q-dialog v-model="mapDialog.open" maximized @show="onMapDialogShow" @hide="onMapDialogHide">
      <q-card class="column no-wrap" style="height: 100vh; width: 100vw;">
        <q-card-section class="row items-center bg-teal-8 text-white q-py-sm">
          <div class="text-h6 text-bold font-outfit">Peta Sebaran Titik Distribusi Qurban</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-none col relative-position">
          <div id="sebaran-map" style="height: 100%; width: 100%;"></div>
          
          <!-- Loading indicator -->
          <div v-if="mapDialog.loading" class="absolute-full flex flex-center" style="z-index: 1000; background: rgba(255, 255, 255, 0.7);">
            <q-spinner-oval color="teal-8" size="50px" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { api } from 'boot/axios'
import { Notify, Dialog } from 'quasar'
import L from 'leaflet'

const search = ref('')
const selectedYear = ref(null)
const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const loading = ref(false)
const items = ref([])
const officeOptions = ref([])
const formRef = ref(null)

const pagination = ref({
  sortBy: 'id',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'wilayahdistribusi', label: 'Wilayah & Alamat Titik', align: 'left', field: 'wilayahdistribusi', sortable: true },
  { name: 'user_pj', label: 'PJ Lapangan', align: 'left', field: 'user_pj', sortable: true },
  { name: 'quota', label: 'Quota / Sisa', align: 'left' },
  { name: 'timeAdded', label: 'Tgl Dibuat', align: 'left', field: 'timeAdded', format: val => formatDate(val) },
  { name: 'status', label: 'Status', align: 'center', field: 'status' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const dialog = reactive({
  open: false,
  isEdit: false
})

const form = reactive({
  id: '',
  office: '',
  pm: '',
  prov: '',
  kab: '',
  kec: '',
  kel: '',
  wilayahdistribusi: '',
  user_pj: '',
  status: 'ON',
  quota: 0,
  tersedia: 0
})

const options = reactive({
  prov: [],
  kab: [],
  kec: [],
  kel: [],
  users: []
})

let originalQuota = 0
let originalTersedia = 0

const onProvChange = () => {
  form.kab = ''
  form.kec = ''
  form.kel = ''
  options.kab = []
  options.kec = []
  options.kel = []
}

const onKabChange = () => {
  form.kec = ''
  form.kel = ''
  options.kec = []
  options.kel = []
}

const onKecChange = () => {
  form.kel = ''
  options.kel = []
}

const filterProv = async (val, update) => {
  try {
    const response = await api.get('/admin/locations/provinces', { params: { search: val } })
    update(() => {
      options.prov = response.data
    })
  } catch (err) {
    console.error('Filter prov failed:', err)
  }
}

const filterKab = async (val, update) => {
  if (!form.prov) return
  try {
    const response = await api.get('/admin/locations/regencies', {
      params: { province: form.prov, search: val }
    })
    update(() => {
      options.kab = response.data
    })
  } catch (err) {
    console.error('Filter kab failed:', err)
  }
}

const filterKec = async (val, update) => {
  if (!form.prov || !form.kab) return
  try {
    const response = await api.get('/admin/locations/districts', {
      params: { province: form.prov, regency: form.kab, search: val }
    })
    update(() => {
      options.kec = response.data
    })
  } catch (err) {
    console.error('Filter kec failed:', err)
  }
}

const filterKel = async (val, update) => {
  if (!form.prov || !form.kab || !form.kec) return
  try {
    const response = await api.get('/admin/locations/villages', {
      params: { province: form.prov, regency: form.kab, district: form.kec, search: val }
    })
    update(() => {
      options.kel = response.data
    })
  } catch (err) {
    console.error('Filter kel failed:', err)
  }
}

const filterUsers = async (val, update) => {
  try {
    const response = await api.get('/admin/users/search', { params: { search: val } })
    update(() => {
      options.users = response.data
    })
  } catch (err) {
    console.error('Filter users failed:', err)
  }
}

const onQuotaChange = (val) => {
  const newQuota = parseInt(val || 0)
  if (dialog.isEdit) {
    const diff = newQuota - originalQuota
    form.tersedia = originalTersedia + diff
  } else {
    form.tersedia = newQuota
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

const formatDate = (val) => {
  if (!val) return '-'
  if (val.includes('/')) {
    const parts = val.split(' ')
    const dateParts = parts[0].split('/')
    if (dateParts.length === 3) {
      const day = dateParts[0]
      const month = dateParts[1]
      const year = dateParts[2]
      const date = new Date(`${year}-${month}-${day}`)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
      }
    }
  }
  const date = new Date(val.replace(' ', 'T'))
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return val
}

const fetchItems = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/admin/distribusi-qurban', {
      params: {
        search: search.value || undefined,
        year: selectedYear.value || undefined,
        page,
        limit
      }
    })

    items.value = response.data.data
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit
  } catch (error) {
    console.error('Fetch admin points failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal memuat data titik qurban' })
  } finally {
    loading.value = false
  }
}

const resetPageAndFetch = () => {
  pagination.value.page = 1
  fetchItems(1, pagination.value.rowsPerPage)
}

const onTableRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  fetchItems(page, rowsPerPage)
}

const generateWilId = () => {
  const date = new Date()
  const yy = date.getFullYear().toString().slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(100000 + Math.random() * 900000).toString()
  return `WIL-${yy}${mm}${dd}-${random}`
}

const openAddDialog = () => {
  dialog.isEdit = false
  dialog.open = true

  form.id = generateWilId()
  form.office = ''
  form.pm = ''
  form.prov = ''
  form.kab = ''
  form.kec = ''
  form.kel = ''
  form.wilayahdistribusi = ''
  form.user_pj = ''
  form.status = 'ON'
  form.quota = 0
  form.tersedia = 0
  options.users = []
  originalQuota = 0
  originalTersedia = 0
}

const openEditDialog = (row) => {
  dialog.isEdit = true
  dialog.open = true

  form.id = row.id
  form.office = row.office || ''
  form.pm = row.pm || ''
  form.prov = row.prov || ''
  form.kab = row.kab || ''
  form.kec = row.kec || ''

  // Pre-load selected user in dropdown options so it maps correctly
  if (row.user_pj) {
    options.users = [{ login: row.user_pj, name: row.user_pj }]
  } else {
    options.users = []
  }
  form.kel = row.kel || ''
  form.wilayahdistribusi = row.wilayahdistribusi || ''
  form.user_pj = row.user_pj || ''
  form.status = row.status || 'ON'
  form.quota = row.quota || 0
  form.tersedia = row.tersedia || 0
  originalQuota = row.quota || 0
  originalTersedia = row.tersedia || 0
}

const saveItem = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  try {
    if (dialog.isEdit) {
      await api.put(`/admin/distribusi-qurban/${form.id}`, form)
      Notify.create({ type: 'positive', message: 'Titik qurban berhasil diperbarui' })
    } else {
      await api.post('/admin/distribusi-qurban', form)
      Notify.create({ type: 'positive', message: 'Titik qurban berhasil dibuat' })
    }
    dialog.open = false
    fetchItems(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menyimpan data'
    Notify.create({ type: 'negative', message: msg })
  }
}

const confirmDelete = (row) => {
  Dialog.create({
    title: 'Konfirmasi Hapus',
    message: `Apakah Anda yakin ingin menghapus titik distribusi "${row.wilayahdistribusi}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/admin/distribusi-qurban/${row.id}`)
      Notify.create({ type: 'positive', message: 'Titik qurban berhasil dihapus' })
      fetchItems(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menghapus data'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
  } catch (error) {
    console.error('Fetch offices failed:', error)
  }
}

// Map dialog state and leaflet instances
const mapDialog = reactive({
  open: false,
  loading: false
})

let sebaranMapInstance = null
let sebaranMarkerGroup = null

const provinceCoordinates = {
  'ACEH': { lat: 4.6951, lng: 96.7494 },
  'SUMATERA UTARA': { lat: 2.1121, lng: 99.3982 },
  'SUMATERA BARAT': { lat: -0.7399, lng: 100.8000 },
  'RIAU': { lat: 0.5074, lng: 101.5408 },
  'JAMBI': { lat: -1.6101, lng: 103.6131 },
  'SUMATERA SELATAN': { lat: -3.3194, lng: 104.9145 },
  'BENGKULU': { lat: -3.7928, lng: 102.2608 },
  'LAMPUNG': { lat: -4.5586, lng: 105.4000 },
  'KEPULAUAN BANGKA BELITUNG': { lat: -2.7410, lng: 106.4406 },
  'KEPULAUAN RIAU': { lat: 3.9457, lng: 108.1429 },
  'DKI JAKARTA': { lat: -6.2088, lng: 106.8456 },
  'JAKARTA': { lat: -6.2088, lng: 106.8456 },
  'JAWA BARAT': { lat: -7.0909, lng: 107.6689 },
  'JAWA TENGAH': { lat: -7.1510, lng: 110.1402 },
  'DI YOGYAKARTA': { lat: -7.8753, lng: 110.4262 },
  'YOGYAKARTA': { lat: -7.8753, lng: 110.4262 },
  'JAWA TIMUR': { lat: -7.5360, lng: 112.2331 },
  'BANTEN': { lat: -6.4058, lng: 106.0640 },
  'BALI': { lat: -8.4095, lng: 115.1889 },
  'NUSA TENGGARA BARAT': { lat: -8.6529, lng: 117.3616 },
  'NUSA TENGGARA TIMUR': { lat: -8.6573, lng: 121.0794 },
  'KALIMANTAN BARAT': { lat: -0.2788, lng: 111.4753 },
  'KALIMANTAN TENGAH': { lat: -1.6814, lng: 113.3824 },
  'KALIMANTAN SELATAN': { lat: -3.0926, lng: 115.2838 },
  'KALIMANTAN TIMUR': { lat: 1.6406, lng: 116.4194 },
  'KALIMANTAN UTARA': { lat: 3.0731, lng: 116.0414 },
  'SULAWESI UTARA': { lat: 0.6247, lng: 123.9750 },
  'SULAWESI TENGAH': { lat: -1.4300, lng: 121.4456 },
  'SULAWESI SELATAN': { lat: -3.6687, lng: 119.9740 },
  'SULAWESI TENGGARA': { lat: -4.1449, lng: 122.1746 },
  'GORONTALO': { lat: 0.6999, lng: 122.4467 },
  'SULAWESI BARAT': { lat: -2.8441, lng: 119.2321 },
  'MALUKU': { lat: -3.2385, lng: 130.1453 },
  'MALUKU UTARA': { lat: 1.5700, lng: 127.8000 },
  'PAPUA': { lat: -4.2699, lng: 138.0803 },
  'PAPUA BARAT': { lat: -1.3361, lng: 132.9000 },
  'PAPUA SELATAN': { lat: -7.5000, lng: 139.5000 },
  'PAPUA TENGAH': { lat: -4.0000, lng: 136.0000 },
  'PAPUA PEGUNUNGAN': { lat: -4.5000, lng: 139.0000 },
  'PAPUA BARAT DAYA': { lat: -1.1500, lng: 131.5000 }
}

let geoJsonData = null

const fetchGeoJson = async () => {
  if (geoJsonData) return geoJsonData
  try {
    const response = await fetch('/indonesia-province-simple.json')
    geoJsonData = await response.json()
    return geoJsonData
  } catch (err) {
    console.error('Failed to load geojson:', err)
    return null
  }
}

const getPointLatLng = (point, geojson) => {
  const provText = (point.prov || '').toUpperCase().trim()
  const kabText = (point.kab || '').toUpperCase().trim()
  const fullText = `${provText} ${kabText} ${(point.wilayahdistribusi || '')}`.toUpperCase()

  let baseCoords = null

  // 1. Try to find matching province in GeoJSON features
  if (geojson && geojson.features && provText) {
    const cleanProv = provText.replace(/[^A-Z]/g, '')
    const cleanFull = fullText.replace(/[^A-Z]/g, '')

    const matchedFeature = geojson.features.find(f => {
      const propName = (f.properties.Propinsi || '').toUpperCase().trim()
      const cleanProp = propName.replace(/[^A-Z]/g, '')
      if (!cleanProp) return false
      
      // Match if clean database prov name equals clean GeoJSON prop name,
      // or if one contains the other, or if it is found in full address text
      return cleanProv === cleanProp || 
             cleanProv.includes(cleanProp) || 
             cleanProp.includes(cleanProv) ||
             cleanFull.includes(cleanProp)
    })

    if (matchedFeature) {
      try {
        const tempLayer = L.geoJSON(matchedFeature)
        const bounds = tempLayer.getBounds()
        if (bounds.isValid()) {
          const center = bounds.getCenter()
          baseCoords = { lat: center.lat, lng: center.lng }
        }
      } catch (err) {
        console.error('Failed to get centroid from geoJSON feature:', err)
      }
    }
  }

  // 2. If no matching feature found (or overseas/null), fallback to static coordinates
  if (!baseCoords) {
    for (const provName of Object.keys(provinceCoordinates)) {
      if (fullText.includes(provName)) {
        baseCoords = provinceCoordinates[provName]
        break
      }
    }
  }

  // 3. Fallback to overseas mappings
  if (!baseCoords) {
    const mappings = [
      { keys: ['EAST KALIMANTAN', 'KALIMANTAN TIMUR', 'KALTIM', 'BERAU'], coords: provinceCoordinates['KALIMANTAN TIMUR'] },
      { keys: ['WEST KALIMANTAN', 'KALIMANTAN BARAT', 'KALBAR'], coords: provinceCoordinates['KALIMANTAN BARAT'] },
      { keys: ['SOUTH KALIMANTAN', 'KALIMANTAN SELATAN', 'KALSEL'], coords: provinceCoordinates['KALIMANTAN SELATAN'] },
      { keys: ['CENTRAL KALIMANTAN', 'KALIMANTAN TENGAH', 'KALTENG'], coords: provinceCoordinates['KALIMANTAN TENGAH'] },
      { keys: ['NORTH KALIMANTAN', 'KALIMANTAN UTARA', 'KALTARA'], coords: provinceCoordinates['KALIMANTAN UTARA'] },
      
      { keys: ['EAST JAVA', 'JAWA TIMUR', 'JATIM'], coords: provinceCoordinates['JAWA TIMUR'] },
      { keys: ['WEST JAVA', 'JAWA BARAT', 'JABAR', 'BOGOR', 'GARUT', 'BEKASI', 'CIANJUR', 'DEPOK', 'TASIKMALAYA', 'BANDUNG'], coords: provinceCoordinates['JAWA BARAT'] },
      { keys: ['CENTRAL JAVA', 'JAWA TENGAH', 'JATENG', 'BOYOLALI', 'SRAGEN', 'SEMARANG', 'KARANGANYAR'], coords: provinceCoordinates['JAWA TENGAH'] },
      
      { keys: ['BALI', 'DENPASAR', 'KARANGASEM', 'BANGLI'], coords: provinceCoordinates['BALI'] },
      { keys: ['YOGYAKARTA', 'DIY', 'DI YOGYAKARTA'], coords: provinceCoordinates['DI YOGYAKARTA'] },
      { keys: ['BANTEN', 'TANGERANG', 'LEBAK', 'SERANG'], coords: provinceCoordinates['BANTEN'] },
      
      { keys: ['DKI JAKARTA', 'JAKARTA'], coords: provinceCoordinates['DKI JAKARTA'] },
      
      { keys: ['NORTH SUMATRA', 'SUMATERA UTARA', 'SUMUT', 'TEBING TINGGI'], coords: provinceCoordinates['SUMATERA UTARA'] },
      { keys: ['WEST SUMATRA', 'SUMATERA BARAT', 'SUMBAR'], coords: provinceCoordinates['SUMATERA BARAT'] },
      { keys: ['SOUTH SUMATRA', 'SUMATERA SELATAN', 'SUMSEL', 'BANYUASIN'], coords: provinceCoordinates['SUMATERA SELATAN'] },
      { keys: ['RIAU', 'BENGKALIS'], coords: provinceCoordinates['RIAU'] },
      { keys: ['JAMBI', 'BATANGHARI'], coords: provinceCoordinates['JAMBI'] },
      { keys: ['BENGKULU'], coords: provinceCoordinates['BENGKULU'] },
      { keys: ['LAMPUNG', 'WAY KANAN'], coords: provinceCoordinates['LAMPUNG'] },
      { keys: ['BANGKA', 'BELITUNG'], coords: provinceCoordinates['KEPULAUAN BANGKA BELITUNG'] },
      { keys: ['KEPULAUAN RIAU', 'KEPRI'], coords: provinceCoordinates['KEPULAUAN RIAU'] },
      
      { keys: ['SOUTH SULAWESI', 'SULAWESI SELATAN', 'SULSEL', 'TORAJA', 'BULUKUMBA', 'LUWU'], coords: provinceCoordinates['SULAWESI SELATAN'] },
      { keys: ['NORTH SULAWESI', 'SULAWESI UTARA', 'SULUT', 'BITUNG'], coords: provinceCoordinates['SULAWESI UTARA'] },
      { keys: ['CENTRAL SULAWESI', 'SULAWESI TENGAH', 'SULTENG', 'PALU', 'TOLI TOLI'], coords: provinceCoordinates['SULAWESI TENGAH'] },
      { keys: ['SOUTHEAST SULAWESI', 'SULAWESI TENGGARA', 'SULTRA', 'KONAWE'], coords: provinceCoordinates['SULAWESI TENGGARA'] },
      { keys: ['GORONTALO'], coords: provinceCoordinates['GORONTALO'] },
      { keys: ['WEST SULAWESI', 'SULAWESI BARAT', 'SULBAR', 'MAJENE', 'MAMUJU'], coords: provinceCoordinates['SULAWESI BARAT'] },
      
      { keys: ['WEST NUSA TENGGARA', 'NUSA TENGGARA BARAT', 'NTB', 'LOMBOK', 'BIMA'], coords: provinceCoordinates['NUSA TENGGARA BARAT'] },
      { keys: ['EAST NUSA TENGGARA', 'NUSA TENGGARA TIMUR', 'NTT', 'TIMOR', 'MANGGARAI', 'LEMATA', 'KUPANG', 'SIKKA', 'FLORES'], coords: provinceCoordinates['NUSA TENGGARA TIMUR'] },
      
      { keys: ['MALUKU', 'ARU', 'BURU'], coords: provinceCoordinates['MALUKU'] },
      { keys: ['NORTH MALUKU', 'MALUKU UTARA', 'HALMAHERA'], coords: provinceCoordinates['MALUKU UTARA'] },
      
      { keys: ['PAPUA', 'JAYAPURA', 'SARMI', 'MERAUKE'], coords: provinceCoordinates['PAPUA'] },
      { keys: ['PAPUA BARAT', 'MANOKWARI'], coords: provinceCoordinates['PAPUA BARAT'] },
      { keys: ['PAPUA SELATAN'], coords: provinceCoordinates['PAPUA SELATAN'] },
      { keys: ['PAPUA TENGAH', 'MIMIKA', 'NABIRE'], coords: provinceCoordinates['PAPUA TENGAH'] },
      { keys: ['PAPUA PEGUNUNGAN'], coords: provinceCoordinates['PAPUA PEGUNUNGAN'] },
      { keys: ['PAPUA BARAT DAYA', 'SORONG'], coords: provinceCoordinates['PAPUA BARAT DAYA'] }
    ]

    for (const mapping of mappings) {
      if (mapping.keys.some(k => fullText.includes(k))) {
        baseCoords = mapping.coords
        break
      }
    }
  }

  // 4. Default Fallback to DKI Jakarta
  if (!baseCoords) {
    const normProv = provText
    if (normProv.includes('UGANDA')) baseCoords = { lat: 1.3733, lng: 32.2903 }
    else if (normProv.includes('SUDAN')) baseCoords = { lat: 12.8628, lng: 30.2176 }
    else if (normProv.includes('KENYA')) baseCoords = { lat: -0.0236, lng: 37.9062 }
    else if (normProv.includes('CAMEROON')) baseCoords = { lat: 7.3697, lng: 12.3547 }
    else if (normProv.includes('MALI')) baseCoords = { lat: 17.5707, lng: -3.9962 }
    else if (normProv.includes('PALESTINA') || normProv.includes('GAZA')) baseCoords = { lat: 31.9522, lng: 35.2332 }
    else if (normProv.includes('YORDANIA') || normProv.includes('JORDAN')) baseCoords = { lat: 30.5852, lng: 36.2384 }
    else if (normProv.includes('MYANMAR') || normProv.includes('RAKHINE')) baseCoords = { lat: 21.9162, lng: 95.9560 }
    else if (normProv.includes('SOMALIA')) baseCoords = { lat: 5.1521, lng: 46.1996 }
    else if (normProv.includes('TANZANIA')) baseCoords = { lat: -6.3690, lng: 34.8888 }
    else if (normProv.includes('NIGER')) baseCoords = { lat: 17.6078, lng: 8.0817 }
    else if (normProv.includes('TIMOR LESTE')) baseCoords = { lat: -8.8742, lng: 125.7275 }
    else {
      baseCoords = { lat: -6.2088, lng: 106.8456 }
    }
  }

  let hash = 0
  const idStr = point.id || ''
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  const jitterLat = ((hash & 0xFF) / 255 - 0.5) * 0.15
  const jitterLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.15

  return {
    lat: baseCoords.lat + jitterLat,
    lng: baseCoords.lng + jitterLng
  }
}

const openMapDialog = () => {
  mapDialog.open = true
}

const onMapDialogShow = async () => {
  mapDialog.loading = true
  await nextTick()

  if (!sebaranMapInstance) {
    sebaranMapInstance = L.map('sebaran-map').setView([-2.5489, 118.0149], 5)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(sebaranMapInstance)
    sebaranMarkerGroup = L.layerGroup().addTo(sebaranMapInstance)
  } else {
    setTimeout(() => {
      sebaranMapInstance.invalidateSize()
    }, 100)
  }

  // Load geojson
  const geojson = await fetchGeoJson()

  // Render geojson boundaries if available
  if (geojson && sebaranMapInstance) {
    L.geoJSON(geojson, {
      style: {
        color: '#009688',
        weight: 1,
        fillColor: '#009688',
        fillOpacity: 0.03
      }
    }).addTo(sebaranMapInstance)
  }

  try {
    const response = await api.get('/admin/distribusi-qurban', {
      params: {
        search: search.value || undefined,
        year: selectedYear.value || undefined,
        limit: 1000,
        page: 1
      }
    })
    const points = response.data.data || []
    renderSebaranPoints(points, geojson)
  } catch (err) {
    console.error('Fetch map sebaran points failed:', err)
    Notify.create({ type: 'negative', message: 'Gagal memuat peta sebaran' })
  } finally {
    mapDialog.loading = false
  }
}

const onMapDialogHide = () => {
  if (sebaranMarkerGroup) {
    sebaranMarkerGroup.clearLayers()
  }
}

const renderSebaranPoints = (points, geojson) => {
  if (!sebaranMapInstance || !sebaranMarkerGroup) return
  sebaranMarkerGroup.clearLayers()
  if (points.length === 0) return

  const bounds = L.latLngBounds()

  points.forEach(point => {
    const coords = getPointLatLng(point, geojson)
    const color = getProgressColor(point.tersedia, point.quota)
    let hexColor = '#21ba45' // positive
    if (color === 'negative') hexColor = '#db2828'
    else if (color === 'orange-8') hexColor = '#f57c00'
    else if (color === 'amber-8') hexColor = '#fbc02d'
    else if (color === 'blue-7') hexColor = '#1976d2'

    const customIcon = L.divIcon({
      html: `<div class="map-pin" style="background-color: ${hexColor}; width: 18px; height: 18px; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-leaflet-pin-sebaran',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })

    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
    const address = [point.kel, point.kec, point.kab, point.prov].filter(Boolean).join(', ') || '-'
    const ratio = point.quota ? (point.tersedia || 0) / point.quota : 0
    const pct = Math.round(ratio * 100)

    const progressBarHtml = `
      <div style="margin-top: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
          <span>Tersedia: ${point.tersedia || 0} / ${point.quota || 0}</span>
          <span>${pct}%</span>
        </div>
        <div style="background: #e0e0e0; border-radius: 4px; height: 6px; width: 100%; overflow: hidden;">
          <div style="background: ${hexColor}; height: 100%; width: ${pct}%;"></div>
        </div>
      </div>
    `

    const popupContent = `
      <div class="map-popup-card" style="min-width: 220px; font-family: sans-serif;">
        <div class="popup-title" style="font-weight: bold; font-size: 13px; color: #333; margin-bottom: 4px;">
          ${point.wilayahdistribusi}
        </div>
        <div class="popup-info" style="font-size: 11px; color: #666; margin-bottom: 4px;">
          <b>PJ:</b> ${point.user_pj || 'Belum Ditentukan'}
        </div>
        <div class="popup-info" style="font-size: 11px; color: #666; margin-bottom: 4px;">
          <b>Alamat:</b> ${address}
        </div>
        ${progressBarHtml}
      </div>
    `

    marker.bindPopup(popupContent)
    sebaranMarkerGroup.addLayer(marker)
    bounds.extend([coords.lat, coords.lng])
  })

  if (points.length > 0) {
    setTimeout(() => {
      sebaranMapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }, 200)
  }
}

onMounted(() => {
  fetchItems(1, 10)
  fetchOffices()
})

onBeforeUnmount(() => {
  if (sebaranMapInstance) {
    sebaranMapInstance.remove()
    sebaranMapInstance = null
  }
})
</script>

<style lang="scss" scoped>
.border-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.02) !important;
}
</style>
