<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Pengaturan Program</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Kelola master program penyaluran BMH, sub program, dan target SDGs</p>
      </div>
      <div>
        <q-btn
          color="orange-9"
          icon="add"
          label="Tambah Program"
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
            label="Cari ID program, nama, atau sub program..."
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
      </div>

      <q-table
        :rows="items"
        :columns="columns"
        row-key="IDPROGRAM"
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
        <template v-slot:body-cell-STATUS="props">
          <q-td :props="props" align="center">
            <q-badge :color="props.row.STATUS === 'ON' ? 'positive' : 'negative'" class="q-py-xs q-px-sm text-bold">
              {{ props.row.STATUS }}
            </q-badge>
          </q-td>
        </template>

        <!-- Custom program detail/sub column -->
        <template v-slot:body-cell-detail="props">
          <q-td :props="props">
            <div style="font-size: 13px;">
              Sub: <b>{{ props.row.SUB_PROGRAM || '-' }}</b>
            </div>
            <div class="text-caption text-grey-7">
              {{ props.row.DETAIL_PRORAM || '-' }}
            </div>
          </q-td>
        </template>

        <!-- Custom dates column -->
        <template v-slot:body-cell-dates="props">
          <q-td :props="props" align="left">
            <div class="text-caption">Reg: <b>{{ formatDate(props.row.REG_DATE) }}</b></div>
            <div class="text-caption text-grey-6" v-if="props.row.OFF_DATE">Off: <b>{{ formatDate(props.row.OFF_DATE) }}</b></div>
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
          <div class="text-h6 text-bold">{{ dialog.isEdit ? 'Edit Program' : 'Tambah Program' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="scroll" style="max-height: 70vh;">
          <q-form ref="formRef" class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6" v-if="!dialog.isEdit">
              <q-input
                v-model="form.IDPROGRAM"
                label="ID Program (Contoh: PROG-001) *"
                outlined
                dense
                hint="Wajib diisi dan unik"
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.PROGRAM_NAME"
                label="Nama Program *"
                outlined
                dense
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.SUB_PROGRAM"
                label="Sub Program"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.DETAIL_PRORAM"
                label="Detail Program"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.SDGS"
                label="SDGs Target"
                outlined
                dense
                placeholder="Contoh: No Poverty, Zero Hunger"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.STATUS"
                :options="['ON', 'OFF']"
                label="Status Program *"
                outlined
                dense
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.NOTES"
                label="Catatan / Notes"
                outlined
                dense
                type="textarea"
                rows="2"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
          <q-btn label="Simpan" color="orange-9" class="q-px-lg text-bold" no-caps @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from 'boot/axios'
import { Notify, Dialog } from 'quasar'

const search = ref('')
const loading = ref(false)
const items = ref([])
const formRef = ref(null)

const pagination = ref({
  sortBy: 'IDPROGRAM',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'IDPROGRAM', label: 'ID Program', align: 'left', field: 'IDPROGRAM', sortable: true },
  { name: 'PROGRAM_NAME', label: 'Nama Program', align: 'left', field: 'PROGRAM_NAME', sortable: true },
  { name: 'detail', label: 'Sub & Detail Program', align: 'left' },
  { name: 'SDGS', label: 'SDGs', align: 'left', field: 'SDGS', sortable: true },
  { name: 'dates', label: 'Tanggal Registrasi', align: 'left' },
  { name: 'STATUS', label: 'Status', align: 'center', field: 'STATUS' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const dialog = reactive({
  open: false,
  isEdit: false
})

const form = reactive({
  IDPROGRAM: '',
  PROGRAM_NAME: '',
  SUB_PROGRAM: '',
  DETAIL_PRORAM: '',
  NOTES: '',
  SDGS: '',
  STATUS: 'ON',
  REG_DATE: '',
  OFF_DATE: null
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const fetchItems = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/admin/program', {
      params: {
        search: search.value || undefined,
        page,
        limit
      }
    })

    items.value = response.data.data
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit
  } catch (error) {
    console.error('Fetch admin programs failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal memuat data program' })
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

const openAddDialog = () => {
  dialog.isEdit = false
  dialog.open = true

  form.IDPROGRAM = ''
  form.PROGRAM_NAME = ''
  form.SUB_PROGRAM = ''
  form.DETAIL_PRORAM = ''
  form.NOTES = ''
  form.SDGS = ''
  form.STATUS = 'ON'
  form.REG_DATE = new Date().toISOString().substring(0, 10)
  form.OFF_DATE = null
}

const openEditDialog = (row) => {
  dialog.isEdit = true
  dialog.open = true

  form.IDPROGRAM = row.IDPROGRAM
  form.PROGRAM_NAME = row.PROGRAM_NAME || ''
  form.SUB_PROGRAM = row.SUB_PROGRAM || ''
  form.DETAIL_PRORAM = row.DETAIL_PRORAM || ''
  form.NOTES = row.NOTES || ''
  form.SDGS = row.SDGS || ''
  form.STATUS = row.STATUS || 'ON'
  form.REG_DATE = row.REG_DATE ? new Date(row.REG_DATE).toISOString().substring(0, 10) : ''
  form.OFF_DATE = row.OFF_DATE ? new Date(row.OFF_DATE).toISOString().substring(0, 10) : null
}

const saveItem = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  try {
    if (dialog.isEdit) {
      // Set off_date if status is turned OFF
      if (form.STATUS === 'OFF' && !form.OFF_DATE) {
        form.OFF_DATE = new Date().toISOString().substring(0, 10)
      } else if (form.STATUS === 'ON') {
        form.OFF_DATE = null
      }
      await api.put(`/admin/program/${form.IDPROGRAM}`, form)
      Notify.create({ type: 'positive', message: 'Program berhasil diperbarui' })
    } else {
      await api.post('/admin/program', form)
      Notify.create({ type: 'positive', message: 'Program berhasil dibuat' })
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
    message: `Apakah Anda yakin ingin menghapus program "${row.PROGRAM_NAME}" (ID: ${row.IDPROGRAM})?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/admin/program/${row.IDPROGRAM}`)
      Notify.create({ type: 'positive', message: 'Program berhasil dihapus' })
      fetchItems(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menghapus data'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

onMounted(() => {
  fetchItems(1, 10)
})
</script>

<style lang="scss" scoped>
.border-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.02) !important;
}
</style>
