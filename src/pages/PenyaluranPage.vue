<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-primary q-my-none">Manajemen Penyaluran Donasi</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Alur pengajuan dan realisasi bantuan mustahik</p>
      </div>
      <div>
        <q-btn
          color="primary"
          icon="add"
          label="Buat Pengajuan Baru"
          class="rounded-borders text-bold q-py-sm"
          no-caps
          @click="openAddDialog"
        />
      </div>
    </div>

    <!-- Filter & Table Card -->
    <q-card class="bg-white q-pa-md border-card">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="filters.mustahik"
            label="Cari Nama Mustahik"
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
        <div class="col-6 col-sm-3">
          <q-select
            v-model="filters.status"
            :options="['MASUK', 'DITOLAK']"
            label="Status Alur"
            outlined
            dense
            clearable
            @update:model-value="resetPageAndFetch"
          />
        </div>
        <div class="col-6 col-sm-3">
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
      </div>

      <!-- Transaction Table -->
      <q-table
        :rows="transactionsList"
        :columns="columns"
        row-key="IDTRANS"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onTableRequest"
        binary-state-sort
        flat
        bordered
        class="penyaluran-table rounded-borders"
        :grid="$q.screen.xs"
      >
        <!-- Grid item for mobile view -->
        <template v-slot:item="props">
          <div class="q-pa-xs col-12 col-sm-6">
            <q-card class="bg-white border-card q-pa-sm">
              <q-card-section class="q-pb-xs">
                <div class="row items-center justify-between no-wrap">
                  <div class="text-subtitle2 text-weight-bold text-dark ellipsis">{{ props.row.IDTRANS }}</div>
                  <q-badge :color="getStatusColor(props.row.STATUS)" class="q-py-xs q-px-sm text-bold">
                    {{ props.row.STATUS }}
                  </q-badge>
                </div>
                <div class="text-caption text-grey-6">{{ props.row.TGL_TRANS ? props.row.TGL_TRANS.split('T')[0] : '' }}</div>
              </q-card-section>
              <q-separator />
              <q-card-section class="q-py-sm">
                <div class="text-caption text-grey-8">
                  <b>Penerima:</b> {{ props.row.mustahik_name || 'Tidak Diketahui' }}
                </div>
                <div class="text-caption text-grey-5">
                  IDM: {{ props.row.IDMUSTAHIK }}
                </div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  <b>Bayar Via:</b> {{ props.row.CARA_BAYAR || '-' }}
                </div>
                <div class="text-caption text-blue-9 q-mt-xs">
                  Pengajuan: <b>{{ formatRupiah(props.row.NILAI_PENGAJUAN) }}</b>
                </div>
                <div class="text-caption text-indigo-9">
                  Acc: <b>{{ formatRupiah(props.row.NILAI_ACC) }}</b>
                </div>
                <div class="text-caption text-teal-9">
                  Realisasi: <b>{{ formatRupiah(props.row.NILAI) }}</b>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-actions align="right" class="q-py-xs">
                <q-btn flat round color="primary" icon="visibility" size="sm" @click="openDetailsDialog(props.row)">
                  <q-tooltip>Alur & Detail Rincian</q-tooltip>
                </q-btn>
                <q-btn flat round color="secondary" icon="edit" size="sm" @click="openEditDialog(props.row)" :disable="isLocked(props.row) || !canModify(props.row)">
                  <q-tooltip>Ubah</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <template v-slot:body-cell-IDTRANS="props">
          <q-td :props="props">
            <div class="text-weight-bold text-dark">{{ props.row.IDTRANS }}</div>
            <div class="text-caption text-grey-6">{{ props.row.TGL_TRANS ? props.row.TGL_TRANS.split('T')[0] : '' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-mustahik_name="props">
          <q-td :props="props">
            <div class="text-weight-bold text-dark">{{ props.row.mustahik_name || 'Tidak Diketahui' }}</div>
            <div class="text-caption text-grey-6">IDM: {{ props.row.IDMUSTAHIK }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-nominal="props">
          <q-td :props="props">
            <div>Pengajuan: <b>{{ formatRupiah(props.row.NILAI_PENGAJUAN) }}</b></div>
            <div class="text-indigo-9">Acc: <b>{{ formatRupiah(props.row.NILAI_ACC) }}</b></div>
            <div class="text-teal-9 text-weight-bold">Realisasi: {{ formatRupiah(props.row.NILAI) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-STATUS="props">
          <q-td :props="props" align="center">
            <q-badge :color="getStatusColor(props.row.STATUS)" class="q-py-xs q-px-sm text-bold">
              {{ props.row.STATUS }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-action="props">
          <q-td :props="props" align="center" class="q-gutter-xs">
            <!-- Details / Workflow Button -->
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="visibility"
              @click="openDetailsDialog(props.row)"
            >
              <q-tooltip>Alur & Detail Rincian</q-tooltip>
            </q-btn>

            <!-- Edit Button (Only editable if not finished/rejected) -->
            <q-btn
              flat
              round
              dense
              color="secondary"
              icon="edit"
              @click="openEditDialog(props.row)"
              :disable="isLocked(props.row) || !canModify(props.row)"
            >
              <q-tooltip>Ubah</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Details & Workflow Transitions -->
    <q-dialog v-model="detailsDialog.open">
      <q-card style="width: 750px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="bg-primary text-white row items-center q-py-sm">
          <div class="text-h6 text-bold">Detail Transaksi Penyaluran</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="detailsDialog.data" class="scroll" style="max-height: 70vh;">
          <!-- Workflow Status Stepper/Progress Bar -->
          <div class="row justify-between items-center q-px-md q-py-md bg-grey-2 rounded-borders q-mb-md">
            <div>
              <div class="text-caption text-grey-7">Status Saat Ini:</div>
              <div class="text-h6 text-bold" :class="`text-${getStatusColor(detailsDialog.data.STATUS)}` ">
                {{ detailsDialog.data.STATUS }}
              </div>
            </div>
            
            <!-- Transition Buttons based on current status (Only Print receipt on Penyaluran page) -->
            <div class="row q-gutter-xs" v-if="canModify(detailsDialog.data)">
              <q-btn
                v-if="detailsDialog.data.STATUS === 'FINISH'"
                color="secondary"
                icon="print"
                label="Print Bukti Penyaluran"
                no-caps
                dense
                class="q-px-md text-bold"
                @click="printReceipt(detailsDialog.data)"
              />
            </div>
          </div>

          <!-- Transaction details info grid -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">ID Transaksi</div>
              <div class="text-subtitle1 text-weight-bold text-dark">{{ detailsDialog.data.IDTRANS }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">Tanggal Pengajuan</div>
              <div class="text-subtitle1 text-weight-bold text-dark">{{ detailsDialog.data.TGL_TRANS ? detailsDialog.data.TGL_TRANS.split('T')[0] : '' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-7">Mustahik Penerima</div>
              <div class="text-subtitle1 text-weight-bold text-dark">
                {{ detailsDialog.data.mustahik_name }}
                <span class="text-caption text-grey-7"> (IDM: {{ detailsDialog.data.IDMUSTAHIK }})</span>
              </div>
              <div class="text-caption text-grey-7">{{ detailsDialog.data.mustahik_alamat }}</div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-7">Nilai Pengajuan</div>
              <div class="text-subtitle1 text-weight-bold text-blue-9">{{ formatRupiah(detailsDialog.data.NILAI_PENGAJUAN) }}</div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-7">Nilai Disetujui (ACC)</div>
              <div class="text-subtitle1 text-weight-bold text-indigo-9">{{ formatRupiah(detailsDialog.data.NILAI_ACC) }}</div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="text-caption text-grey-7">Realisasi Real</div>
              <div class="text-subtitle1 text-weight-bold text-teal-9">{{ formatRupiah(detailsDialog.data.NILAI) }}</div>
            </div>

            <!-- Uploaded Docs Section -->
            <div class="col-12 col-sm-6" v-if="detailsDialog.data.PENGAJUAN_DOC">
              <div class="text-caption text-grey-7">Dokumen Pengajuan</div>
              <div class="q-mt-xs">
                <div v-if="isImageFile(detailsDialog.data.PENGAJUAN_DOC)">
                  <q-img
                    :src="getFileUrl(detailsDialog.data.PENGAJUAN_DOC)"
                    style="height: 80px; max-width: 150px; cursor: pointer; border-radius: 6px; border: 1px solid #ddd;"
                    @click="previewImage(detailsDialog.data.PENGAJUAN_DOC)"
                    spinner-color="primary"
                  >
                    <div class="absolute-bottom text-subtitle2 text-center q-pa-none" style="font-size: 10px; background: rgba(0, 0, 0, 0.45);">
                      Klik untuk memperbesar
                    </div>
                  </q-img>
                </div>
                <a
                  v-else
                  :href="getFileUrl(detailsDialog.data.PENGAJUAN_DOC)"
                  target="_blank"
                  class="text-primary row items-center no-wrap text-subtitle2 text-bold"
                >
                  <q-icon name="open_in_new" class="q-mr-xs" />
                  Lihat Dokumen
                </a>
              </div>
            </div>
            <div class="col-12 col-sm-6" v-if="detailsDialog.data.DOC_SALUR">
              <div class="text-caption text-grey-7">Bukti Penyaluran (Foto)</div>
              <div class="q-mt-xs">
                <div v-if="isImageFile(detailsDialog.data.DOC_SALUR)">
                  <q-img
                    :src="getFileUrl(detailsDialog.data.DOC_SALUR)"
                    style="height: 80px; max-width: 150px; cursor: pointer; border-radius: 6px; border: 1px solid #ddd;"
                    @click="previewImage(detailsDialog.data.DOC_SALUR)"
                    spinner-color="primary"
                  >
                    <div class="absolute-bottom text-subtitle2 text-center q-pa-none" style="font-size: 10px; background: rgba(0, 0, 0, 0.45);">
                      Klik untuk memperbesar
                    </div>
                  </q-img>
                </div>
                <a
                  v-else
                  :href="getFileUrl(detailsDialog.data.DOC_SALUR)"
                  target="_blank"
                  class="text-teal row items-center no-wrap text-subtitle2 text-bold"
                >
                  <q-icon name="photo" class="q-mr-xs" />
                  Lihat Foto Penyaluran
                </a>
              </div>
            </div>
          </div>

          <!-- Program Breakdown sub-table -->
          <div v-if="detailsDialog.data.details && detailsDialog.data.details.length > 0">
            <div class="text-weight-bold text-dark q-mb-sm font-outfit">
              Rincian Program Terkait (dpenyaluran)
            </div>
            <table border="1" bordercolor="#e0e0e0" style="border-collapse: collapse; width: 100%; font-size: 11px; background: #fafafa;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th align="left" style="padding: 6px;">Program</th>
                  <th align="left" style="padding: 6px;">Sub Program</th>
                  <th align="left" style="padding: 6px;">Detail Program</th>
                  <th align="right" style="padding: 6px;">Sub Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in detailsDialog.data.details" :key="d.IDDTRANS">
                  <td style="padding: 6px;">{{ d.PROGRAM }}</td>
                  <td style="padding: 6px;">{{ d.SUB_PROGRAM }}</td>
                  <td style="padding: 6px;">{{ d.DETAIL_PROGRAM || '-' }}</td>
                  <td style="padding: 6px;" align="right"><b>{{ formatRupiah(d.SUB_TOTAL) }}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add/Edit Pengajuan Dialog (Simplified initial form) -->
    <q-dialog v-model="formDialog.open" persistent>
      <q-card style="width: 700px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="bg-primary text-white row items-center q-py-sm">
          <div class="text-h6 text-bold">{{ formDialog.isEdit ? 'Ubah Pengajuan' : 'Buat Pengajuan Penyaluran Baru' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="saveTransaction">
          <q-card-section class="scroll" style="max-height: 65vh;">
            <div class="row q-col-gutter-sm">
              <!-- Mustahik Search Selector -->
              <div class="col-12 col-sm-8">
                <q-select
                  v-model="form.IDMUSTAHIK"
                  :options="mustahikOptions"
                  option-value="IDM"
                  option-label="NAMA_MUSTAHIK"
                  label="Pilih Mustahik *"
                  outlined
                  dense
                  use-input
                  fill-input
                  hide-selected
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Mustahik wajib diisi']"
                  @filter="filterMustahik"
                  @update:model-value="onMustahikChange"
                >
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">Tidak ada mustahik ditemukan</q-item-section></q-item>
                  </template>
                </q-select>
              </div>

              <!-- Date -->
              <div class="col-12 col-sm-4">
                <q-input v-model="form.TGL_TRANS" type="date" label="Tanggal Transaksi *" outlined dense :rules="[val => !!val || 'Tanggal wajib diisi']" stack-label />
              </div>

              <!-- PM Count -->
              <div class="col-12 col-sm-4">
                <q-input v-model.number="form.PM" type="number" label="Penerima Manfaat (Jiwa) *" outlined dense :rules="[val => val >= 1 || 'Minimal 1']" />
              </div>

              <!-- PENGAJUAN_DOC Document uploader -->
              <div class="col-12 col-sm-8">
                <q-file
                  v-model="pengajuanFile"
                  label="Upload Dokumen Pengajuan *"
                  outlined
                  dense
                  accept=".pdf,.jpg,.jpeg,.png"
                  :loading="uploadingDoc"
                  @update:model-value="uploadFile"
                >
                  <template v-slot:prepend>
                    <q-icon name="cloud_upload" />
                  </template>
                </q-file>
                <div v-if="form.PENGAJUAN_DOC" class="text-caption text-grey-7 q-mt-xs ellipsis text-weight-medium">
                  Current File: <a :href="form.PENGAJUAN_DOC" target="_blank" class="text-primary">{{ form.PENGAJUAN_DOC.split('/').pop() }}</a>
                </div>
              </div>

              <!-- NILAI_PENGAJUAN diisi manual -->
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model.number="form.NILAI_PENGAJUAN" 
                  type="number" 
                  label="Nilai Pengajuan (Rp) *" 
                  outlined 
                  dense 
                  :rules="[val => val > 0 || 'Nilai pengajuan wajib diisi dan lebih dari 0']" 
                />
              </div>

              <!-- OFFICE selector -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.OFFICE"
                  :options="officeOptions"
                  option-label="kantor"
                  option-value="officeid"
                  label="Kantor Penyalur *"
                  outlined
                  dense
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Kantor wajib diisi']"
                />
              </div>

              <!-- Description/Keterangan -->
              <div class="col-12">
                <q-input 
                  v-model="form.KET" 
                  label="Keterangan Singkat Pengajuan *" 
                  outlined 
                  dense 
                  type="textarea"
                  rows="2"
                  :rules="[val => !!val || 'Keterangan wajib diisi']"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
            <q-btn type="submit" :label="formDialog.isEdit ? 'Simpan Transaksi' : 'Buat Baru'" color="primary" class="q-px-lg" no-caps />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Image Preview Dialog -->
    <q-dialog v-model="imagePreview.open">
      <q-card style="width: 700px; max-width: 90vw; border-radius: 8px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-bold font-outfit">Preview Foto/Dokumen</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md text-center">
          <q-img :src="imagePreview.url" style="max-height: 70vh; object-fit: contain; border-radius: 4px;" spinner-color="primary" />
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const authStore = useAuthStore()

const imagePreview = ref({
  open: false,
  url: ''
})

const isImageFile = (urlPath) => {
  if (!urlPath) return false
  const cleanPath = urlPath.split('?')[0]
  const ext = cleanPath.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

const getFileUrl = (urlPath) => {
  if (!urlPath) return ''
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath
  }
  const base = api.defaults.baseURL.replace(/\/api$/, '')
  return `${base}${urlPath}`
}

const previewImage = (urlPath) => {
  imagePreview.value.url = getFileUrl(urlPath)
  imagePreview.value.open = true
}

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const filters = reactive({
  mustahik: '',
  status: null,
  office: authStore.user?.office || null,
  year: new Date().getFullYear()
})

const loading = ref(false)
const transactionsList = ref([])
const officeOptions = ref([])
const mustahikOptions = ref([])
let allMustahiksRaw = []

// File Upload states
const pengajuanFile = ref(null)
const uploadingDoc = ref(false)

const pagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'IDTRANS', label: 'ID Transaksi', align: 'left', sortable: true },
  { name: 'mustahik_name', label: 'Penerima (Mustahik)', align: 'left', sortable: true },
  { name: 'CARA_BAYAR', label: 'Bayar Via', field: 'CARA_BAYAR', align: 'left' },
  { name: 'nominal', label: 'Nominal Penyaluran', align: 'right' },
  { name: 'STATUS', label: 'Status Alur', align: 'center', sortable: true },
  { name: 'action', label: 'Aksi', align: 'center' }
]

// Modal details dialog state
const detailsDialog = reactive({
  open: false,
  data: null
})

// Modal form dialog state (Add/Edit)
const formDialog = reactive({
  open: false,
  isEdit: false,
  targetId: null
})

const form = reactive({
  IDMUSTAHIK: '',
  TGL_TRANS: '',
  PM: 1,
  PENGAJUAN_DOC: '',
  NILAI_PENGAJUAN: 0,
  OFFICE: '',
  KET: '',
  TIPE: '',
  UMUM_KHUSUS: '',
  ASNAF: ''
})



// Authorization check helpers
const canModify = (row) => {
  if (authStore.isAdmin) return true
  const userOff = authStore.user?.office || ''
  const rowOff = row.OFFICE || ''
  return rowOff.startsWith(userOff)
}

const isLocked = (row) => {
  return row.STATUS !== 'MASUK' && row.STATUS !== 'OPEN'
}

const getStatusColor = (status) => {
  switch (status) {
    case 'FINISH': return 'teal-8'
    case 'PROSES PENCAIRAN': return 'orange-8'
    case 'DITERIMA': return 'indigo-8'
    case 'OPEN': return 'blue-8'
    case 'MASUK': return 'grey-8'
    case 'DITOLAK': return 'red-8'
    default: return 'grey-6'
  }
}

const formatRupiah = (val) => {
  const num = parseFloat(val || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

// Fetch offices for dropdown list
const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
  } catch (error) {
    console.error('Fetch offices dropdown failed:', error)
  }
}

// Fetch mustahik list for search selector
const fetchAllMustahiks = async () => {
  try {
    const response = await api.get('/mustahik', { params: { limit: 1000 } })
    allMustahiksRaw = response.data.data || []
    mustahikOptions.value = allMustahiksRaw
  } catch (error) {
    console.error('Fetch mustahiks lookup failed:', error)
  }
}

// Searchable dropdown filtering for Mustahik
const filterMustahik = (val, update) => {
  if (val === '') {
    update(() => {
      mustahikOptions.value = allMustahiksRaw
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    mustahikOptions.value = allMustahiksRaw.filter(
      v => v.NAMA_MUSTAHIK.toLowerCase().indexOf(needle) > -1
    )
  })
}

const onMustahikChange = (val) => {
  if (!val) return
  const found = allMustahiksRaw.find(m => m.IDM === val)
  if (found) {
    form.TIPE = found.TIPE || ''
    form.UMUM_KHUSUS = found.UMUM_KHUSUS || ''
    form.ASNAF = found.ASNAF || ''
  }
}

// Fetch main transactions
const fetchTransactions = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/penyaluran', {
      params: {
        mustahikName: filters.mustahik || undefined,
        status: filters.status || undefined,
        statuses: filters.status ? undefined : 'MASUK,DITOLAK',
        office: filters.office || undefined,
        year: filters.year || undefined,
        page,
        limit
      }
    })

    transactionsList.value = response.data.data
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit
  } catch (error) {
    console.error('Fetch penyaluran list failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal mengambil data penyaluran' })
  } finally {
    loading.value = false
  }
}

const resetPageAndFetch = () => {
  pagination.value.page = 1
  fetchTransactions(1, pagination.value.rowsPerPage)
}

const onTableRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  fetchTransactions(page, rowsPerPage)
}

// File uploader method
const uploadFile = async () => {
  const file = pengajuanFile.value
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  uploadingDoc.value = true

  try {
    const res = await api.post('/penyaluran/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    form.PENGAJUAN_DOC = res.data.url
    Notify.create({ type: 'positive', message: 'Dokumen pengajuan berhasil diunggah' })
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'Gagal mengunggah file' })
  } finally {
    uploadingDoc.value = false
  }
}

// View details dialog
const openDetailsDialog = async (row) => {
  try {
    const response = await api.get(`/penyaluran/${row.IDTRANS}`)
    detailsDialog.data = response.data
    detailsDialog.open = true
  } catch (error) {
    console.error(error)
    Notify.create({ type: 'negative', message: 'Gagal memuat rincian transaksi' })
  }
}

// Dialog Add/Edit Handlers (Initial Create/Edit of Pengajuan)
const openAddDialog = () => {
  formDialog.isEdit = false
  formDialog.open = true
  formDialog.targetId = null

  // Reset fields
  form.IDMUSTAHIK = ''
  form.TGL_TRANS = new Date().toISOString().split('T')[0]
  form.PM = 1
  form.PENGAJUAN_DOC = ''
  form.NILAI_PENGAJUAN = 0
  form.OFFICE = authStore.user?.office || ''
  form.KET = ''
  form.TIPE = ''
  form.UMUM_KHUSUS = ''
  form.ASNAF = ''

  pengajuanFile.value = null
}

const openEditDialog = async (row) => {
  try {
    const response = await api.get(`/penyaluran/${row.IDTRANS}`)
    const data = response.data

    formDialog.isEdit = true
    formDialog.open = true
    formDialog.targetId = data.IDTRANS

    form.IDMUSTAHIK = data.IDMUSTAHIK || ''
    form.TGL_TRANS = data.TGL_TRANS ? data.TGL_TRANS.split('T')[0] : ''
    form.PM = data.PM || 1
    form.PENGAJUAN_DOC = data.PENGAJUAN_DOC || ''
    form.NILAI_PENGAJUAN = parseFloat(data.NILAI_PENGAJUAN || 0)
    form.OFFICE = data.OFFICE || ''
    form.KET = data.KET || ''
    form.TIPE = data.TIPE || ''
    form.UMUM_KHUSUS = data.UMUM_KHUSUS || ''
    form.ASNAF = data.ASNAF || ''

    pengajuanFile.value = null
  } catch (error) {
    console.error(error)
    Notify.create({ type: 'negative', message: 'Gagal memuat data transaksi untuk pengeditan' })
  }
}

// Save transaction handler (Initial Create/Edit of Pengajuan)
const saveTransaction = async () => {
  const payload = {
    IDMUSTAHIK: form.IDMUSTAHIK,
    TGL_TRANS: form.TGL_TRANS,
    PM: form.PM,
    PENGAJUAN_DOC: form.PENGAJUAN_DOC,
    NILAI_PENGAJUAN: form.NILAI_PENGAJUAN,
    OFFICE: form.OFFICE,
    KET: form.KET,
    TIPE: form.TIPE,
    UMUM_KHUSUS: form.UMUM_KHUSUS,
    ASNAF: form.ASNAF
  }

  try {
    if (formDialog.isEdit) {
      await api.put(`/penyaluran/${formDialog.targetId}`, payload)
      Notify.create({ type: 'positive', message: 'Pengajuan berhasil diubah' })
    } else {
      await api.post('/penyaluran', payload)
      Notify.create({ type: 'positive', message: 'Pengajuan penyaluran berhasil dibuat' })
    }
    formDialog.open = false
    fetchTransactions(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menyimpan transaksi penyaluran'
    Notify.create({ type: 'negative', message: msg })
  }
}

// Print Receipt logic (FormalBMH receipt window)
const printReceipt = (trx) => {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    Notify.create({ type: 'warning', message: 'Pop-up print diblokir. Harap izinkan pop-up di browser Anda.' })
    return
  }
  
  const detailsHtml = (trx.details || []).map(d => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.PROGRAM}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.SUB_PROGRAM}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.DETAIL_PROGRAM || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;" align="right"><b>${formatRupiah(d.SUB_TOTAL)}</b></td>
    </tr>
  `).join('')

  const html = `
    <html>
      <head>
        <title>Bukti Penyaluran - ${trx.IDTRANS}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 25px; color: #333; }
          .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #444; padding-bottom: 12px; margin-bottom: 20px; }
          .header-text { text-align: left; }
          .title { font-size: 22px; font-weight: bold; margin-bottom: 5px; letter-spacing: 1px; }
          .subtitle { font-size: 14px; font-weight: bold; color: #555; }
          .header-logo img { height: 60px; object-fit: contain; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 30%; font-size: 12px; }
          .sig-line { margin-top: 60px; border-top: 1px solid #333; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-text">
            <div class="title">BAITUL MAAL HIDAYATULLAH (BMH)</div>
            <div class="subtitle">BUKTI PENYALURAN MANFAAT / DONASI</div>
          </div>
          <div class="header-logo">
            <img src="${window.location.origin}/logo_bmh.png" alt="Logo BMH" />
          </div>
        </div>
        
        <table style="width: 100%; font-size: 12px; margin-bottom: 25px; line-height: 1.6;">
          <tr>
            <td width="18%"><b>No. Transaksi</b></td>
            <td width="32%">: ${trx.IDTRANS}</td>
            <td width="18%"><b>Tanggal Salur</b></td>
            <td width="32%">: ${trx.FINISH_DATE ? trx.FINISH_DATE.split('T')[0] : (trx.TGL_TRANS ? trx.TGL_TRANS.split('T')[0] : '')}</td>
          </tr>
          <tr>
            <td><b>Penerima</b></td>
            <td>: ${trx.mustahik_name} (IDM: ${trx.IDMUSTAHIK})</td>
            <td><b>Kantor</b></td>
            <td>: ${trx.OFFICE}</td>
          </tr>
          <tr>
            <td><b>Cara Bayar</b></td>
            <td>: ${trx.CARA_BAYAR}</td>
            <td><b>Tipe Salur</b></td>
            <td>: ${trx.TIPE_PENYALURAN || '-'}</td>
          </tr>
        </table>

        <div style="font-size: 12px; margin-bottom: 5px;"><b>Rincian Program Penyaluran:</b></div>
        <table class="details-table" style="font-size: 12px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th align="left" style="padding: 8px; border: 1px solid #ddd;">Program Utama</th>
              <th align="left" style="padding: 8px; border: 1px solid #ddd;">Sub Program</th>
              <th align="left" style="padding: 8px; border: 1px solid #ddd;">Keterangan</th>
              <th align="right" style="padding: 8px; border: 1px solid #ddd;">Sub Total</th>
            </tr>
          </thead>
          <tbody>
            ${detailsHtml}
            <tr style="background: #fafafa; font-size: 13px;">
              <td colspan="3" align="right" style="padding: 8px; border: 1px solid #ddd;"><b>TOTAL PENYALURAN:</b></td>
              <td align="right" style="padding: 8px; border: 1px solid #ddd;"><b>${formatRupiah(trx.NILAI)}</b></td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 12px; margin-top: 10px; margin-bottom: 30px;">
          <b>Keterangan:</b> ${trx.KET || '-'}
        </div>

        <div class="signatures">
          <div class="sig-box">
            Disetujui Oleh,
            <div class="sig-line"></div>
            ( Manajer Penyaluran )
          </div>
          <div class="sig-box">
            Penerima Manfaat,
            <div class="sig-line"></div>
            ( ${trx.mustahik_name} )
          </div>
          <div class="sig-box">
            Kasir / Petugas,
            <div class="sig-line"></div>
            ( ${trx.USER || 'Petugas BMH'} )
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
          window.onafterprint = function() {
            window.close();
          }
        </${'script'}>
      </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
}

onMounted(async () => {
  await fetchOffices()
  await fetchAllMustahiks()
  await fetchTransactions(1, 10)
})
</script>

<style lang="scss">
.penyaluran-table {
  .q-table__thead {
    background-color: #fafafa;
    color: #424242;
    font-weight: bold;
  }
}
</style>
