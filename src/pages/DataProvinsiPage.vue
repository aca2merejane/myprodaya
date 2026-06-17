<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-orange-9 q-my-none">Pengaturan Provinsi & Wilayah</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Kelola master data wilayah administratif (Provinsi, Kab/Kota, Kecamatan, Desa/Kelurahan)</p>
      </div>
      <div>
        <q-btn
          color="orange-9"
          icon="add"
          label="Tambah Data Wilayah"
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
            label="Cari provinsi, kabupaten, kecamatan, desa, pos..."
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
        <!-- Custom address details column -->
        <template v-slot:body-cell-address="props">
          <q-td :props="props">
            <div style="font-size: 13px; max-width: 300px; white-space: normal; word-break: break-word;">
              Kel. <b>{{ props.row.desa_kelurahan || '-' }}</b>, Kec. <b>{{ props.row.kecamatan || '-' }}</b>, <b>{{ props.row.kabupaten_kota || '-' }}</b>, <b>{{ props.row.provinsi || '-' }}</b>
            </div>
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
          <div class="text-h6 text-bold">{{ dialog.isEdit ? 'Edit Data Wilayah' : 'Tambah Data Wilayah' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="scroll" style="max-height: 70vh;">
          <q-form ref="formRef" class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.provinsi"
                label="Provinsi *"
                outlined
                dense
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.kabupaten_kota"
                label="Kabupaten / Kota *"
                outlined
                dense
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.kecamatan"
                label="Kecamatan *"
                outlined
                dense
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.desa_kelurahan"
                label="Desa / Kelurahan *"
                outlined
                dense
                :rules="[val => !!val || 'Field ini wajib diisi']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.kode_pos"
                label="Kode Pos"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.tahun"
                label="Tahun Data"
                outlined
                dense
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
  sortBy: 'id',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'address', label: 'Alamat Administratif Wilayah', align: 'left' },
  { name: 'kode_pos', label: 'Kode Pos', align: 'center', field: 'kode_pos', sortable: true },
  { name: 'tahun', label: 'Tahun', align: 'center', field: 'tahun', sortable: true },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const dialog = reactive({
  open: false,
  isEdit: false
})

const form = reactive({
  id: null,
  provinsi: '',
  kabupaten_kota: '',
  kecamatan: '',
  desa_kelurahan: '',
  kode_pos: '',
  tahun: ''
})

const fetchItems = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/admin/provinsi', {
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
    console.error('Fetch admin provinces failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal memuat data provinsi' })
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

  form.id = null
  form.provinsi = ''
  form.kabupaten_kota = ''
  form.kecamatan = ''
  form.desa_kelurahan = ''
  form.kode_pos = ''
  form.tahun = new Date().getFullYear().toString()
}

const openEditDialog = (row) => {
  dialog.isEdit = true
  dialog.open = true

  form.id = row.id
  form.provinsi = row.provinsi || ''
  form.kabupaten_kota = row.kabupaten_kota || ''
  form.kecamatan = row.kecamatan || ''
  form.desa_kelurahan = row.desa_kelurahan || ''
  form.kode_pos = row.kode_pos || ''
  form.tahun = row.tahun || ''
}

const saveItem = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  try {
    if (dialog.isEdit) {
      await api.put(`/admin/provinsi/${form.id}`, form)
      Notify.create({ type: 'positive', message: 'Data wilayah berhasil diperbarui' })
    } else {
      await api.post('/admin/provinsi', form)
      Notify.create({ type: 'positive', message: 'Data wilayah berhasil dibuat' })
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
    message: `Apakah Anda yakin ingin menghapus data wilayah "Kel. ${row.desa_kelurahan}, Kec. ${row.kecamatan}, ${row.kabupaten_kota}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/admin/provinsi/${row.id}`)
      Notify.create({ type: 'positive', message: 'Data wilayah berhasil dihapus' })
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
