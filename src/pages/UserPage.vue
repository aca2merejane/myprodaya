<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-primary q-my-none">Manajemen User & Hak Akses</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Kelola akun pengguna, penugasan wilayah kantor, peran kelompok, dan hak akses modul.</p>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <q-card class="bg-white rounded-borders border-card shadow-sm q-mb-md">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="users" icon="people" label="Daftar Pengguna" no-caps class="text-weight-bold" />
        <q-tab name="permissions" icon="security" label="Hak Akses Modul" no-caps class="text-weight-bold" />
      </q-tabs>
    </q-card>

    <!-- Tab Panels -->
    <q-tab-panels v-model="tab" animated class="bg-transparent q-pa-none">
      
      <!-- Panel 1: Users CRUD -->
      <q-tab-panel name="users" class="q-pa-none">
        <q-card class="bg-white q-pa-md border-card relative-position">
          <!-- Top bar with search and Add button -->
          <div class="row items-center justify-between q-col-gutter-sm q-mb-md">
            <div class="col-12 col-sm-4">
              <q-input
                v-model="search"
                label="Cari pengguna berdasarkan nama, login, email..."
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
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="person_add"
                label="Tambah User Baru"
                class="rounded-borders text-bold q-py-sm"
                no-caps
                @click="openAddDialog"
              />
            </div>
          </div>

          <!-- Users Table -->
          <q-table
            :rows="usersList"
            :columns="columns"
            row-key="login"
            :loading="loading"
            v-model:pagination="pagination"
            @request="onTableRequest"
            binary-state-sort
            flat
            bordered
            class="qurban-table rounded-borders"
            :grid="$q.screen.xs"
          >
            <!-- Custom Office Column -->
            <template v-slot:body-cell-office="props">
              <q-td :props="props">
                {{ getOfficeLabel(props.row.office) }}
              </q-td>
            </template>

            <!-- Custom Active Status Column -->
            <template v-slot:body-cell-active="props">
              <q-td :props="props" align="center">
                <q-chip
                  :color="props.row.active === 'Y' ? 'green-1' : 'red-1'"
                  :text-color="props.row.active === 'Y' ? 'green-9' : 'red-9'"
                  dense
                  class="text-weight-bold"
                >
                  {{ props.row.active === 'Y' ? 'Aktif' : 'Non-aktif' }}
                </q-chip>
              </q-td>
            </template>

            <!-- Custom Admin Privilege Column -->
            <template v-slot:body-cell-priv_admin="props">
              <q-td :props="props" align="center">
                <q-icon
                  name="check_circle"
                  color="green"
                  size="sm"
                  v-if="props.row.priv_admin === 'Y'"
                />
                <q-icon name="cancel" color="grey-4" size="sm" v-else />
              </q-td>
            </template>

            <!-- Custom Groups/Roles Column -->
            <template v-slot:body-cell-groups="props">
              <q-td :props="props">
                <div class="row q-gutter-xs">
                  <q-badge
                    v-for="groupId in props.row.group_ids"
                    :key="groupId"
                    color="indigo-1"
                    text-color="indigo-9"
                    class="text-weight-medium text-caption q-py-xs q-px-sm"
                  >
                    {{ getGroupLabel(groupId) }}
                  </q-badge>
                  <span v-if="!props.row.group_ids || props.row.group_ids.length === 0" class="text-grey-5 text-italic text-caption">Tidak ada grup</span>
                </div>
              </q-td>
            </template>

            <!-- Custom Actions Column -->
            <template v-slot:body-cell-actions="props">
              <q-td :props="props" align="center" class="q-gutter-xs">
                <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog(props.row)">
                  <q-tooltip>Edit User</q-tooltip>
                </q-btn>
                <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(props.row)">
                  <q-tooltip>Hapus User</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- Panel 2: Permissions Configuration -->
      <q-tab-panel name="permissions" class="q-pa-none">
        <q-card class="bg-white q-pa-md border-card relative-position">
          <div class="row q-col-gutter-md">
            <!-- Group Selector Side -->
            <div class="col-12 col-md-4">
              <div class="text-subtitle1 text-bold font-outfit q-mb-md text-dark">Langkah 1: Pilih Kelompok / Peran</div>
              <q-list bordered separator class="rounded-borders">
                <q-item
                  v-for="group in groupsList"
                  :key="group.group_id"
                  clickable
                  v-ripple
                  :active="selectedGroupId === group.group_id"
                  active-class="bg-indigo-1 text-indigo-9 text-weight-bold"
                  @click="selectGroup(group.group_id)"
                >
                  <q-item-section avatar>
                    <q-icon name="security" :color="selectedGroupId === group.group_id ? 'primary' : 'grey-7'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ group.description }}</q-item-label>
                    <q-item-label caption>ID: {{ group.group_id }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Permission Checkbox Side -->
            <div class="col-12 col-md-8">
              <div class="text-subtitle1 text-bold font-outfit q-mb-md text-dark">
                Langkah 2: Konfigurasi Akses Modul untuk Kelompok
                <span class="text-indigo-9 text-weight-bold" v-if="selectedGroupObj">
                  "{{ selectedGroupObj.description }}"
                </span>
              </div>

              <div v-if="selectedGroupId" class="q-gutter-md">
                <q-card flat bordered class="rounded-borders q-pa-md bg-grey-1">
                  <div class="row q-col-gutter-md">
                    <div
                      v-for="mod in permissionConfig.modules"
                      :key="mod.app_name"
                      class="col-12 col-sm-6"
                    >
                      <q-card class="bg-white border-card shadow-sm q-pa-md">
                        <div class="text-weight-bold text-dark font-outfit text-subtitle1">{{ mod.description }}</div>
                        <div class="text-caption text-grey-6 q-mb-sm">Key: {{ mod.app_name }}</div>
                        
                        <q-separator class="q-my-sm" />
                        
                        <div class="row q-col-gutter-xs justify-between">
                          <!-- Access -->
                          <div class="col-6 col-sm-3 column items-center">
                            <span style="font-size: 11px;" class="text-grey-7">Akses</span>
                            <q-toggle
                              v-model="permissionConfig.permissions[mod.app_name].access"
                              color="primary"
                              dense
                              @update:model-value="val => onAccessChange(mod.app_name, val)"
                            />
                          </div>
                          <!-- Insert -->
                          <div class="col-6 col-sm-3 column items-center">
                            <span style="font-size: 11px;" class="text-grey-7">Tambah</span>
                            <q-toggle
                              v-model="permissionConfig.permissions[mod.app_name].insert"
                              color="secondary"
                              dense
                              :disable="!permissionConfig.permissions[mod.app_name].access"
                            />
                          </div>
                          <!-- Update -->
                          <div class="col-6 col-sm-3 column items-center">
                            <span style="font-size: 11px;" class="text-grey-7">Ubah</span>
                            <q-toggle
                              v-model="permissionConfig.permissions[mod.app_name].update"
                              color="orange-9"
                              dense
                              :disable="!permissionConfig.permissions[mod.app_name].access"
                            />
                          </div>
                          <!-- Delete -->
                          <div class="col-6 col-sm-3 column items-center">
                            <span style="font-size: 11px;" class="text-grey-7">Hapus</span>
                            <q-toggle
                              v-model="permissionConfig.permissions[mod.app_name].delete"
                              color="negative"
                              dense
                              :disable="!permissionConfig.permissions[mod.app_name].access"
                            />
                          </div>
                        </div>
                      </q-card>
                    </div>
                  </div>
                </q-card>

                <div class="row justify-end q-mt-md">
                  <q-btn
                    color="primary"
                    icon="save"
                    label="Simpan Konfigurasi Akses"
                    class="rounded-borders text-bold q-px-lg"
                    no-caps
                    :loading="savingPermissions"
                    @click="saveGroupPermissions"
                  />
                </div>
              </div>

              <!-- Unselected state -->
              <div v-else class="column items-center justify-center text-center q-py-xl text-grey-6">
                <q-icon name="arrow_back" size="lg" class="q-mb-md animated pulse infinite" />
                <div class="text-subtitle2 text-bold">Silakan pilih salah satu kelompok/peran di kolom sebelah kiri untuk mengonfigurasi akses modul.</div>
              </div>
            </div>
          </div>
        </q-card>
      </q-tab-panel>

    </q-tab-panels>

    <!-- Add/Edit User Dialog -->
    <q-dialog v-model="userDialog.open" persistent>
      <q-card style="width: 650px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center bg-primary text-white q-py-sm">
          <div class="text-h6 text-bold font-outfit">
            {{ userDialog.isEdit ? 'Ubah Data User' : 'Tambah User Baru' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="saveUser">
          <q-card-section class="scroll q-py-md" style="max-height: 70vh;">
            <div class="row q-col-gutter-md">
              <!-- Username/Login -->
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="userForm.login"
                  label="Username (Login) *"
                  outlined
                  dense
                  :disabled="userDialog.isEdit"
                  :rules="[
                    val => !!val || 'Username wajib diisi',
                    val => val.length >= 2 || 'Username minimal 2 karakter'
                  ]"
                />
              </div>

              <!-- Password -->
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="userForm.pswd"
                  :label="userDialog.isEdit ? 'Password (Kosongkan jika tidak diubah)' : 'Password *'"
                  outlined
                  dense
                  type="password"
                  :rules="userDialog.isEdit ? [] : [val => !!val || 'Password wajib diisi']"
                />
              </div>

              <!-- Full Name -->
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="userForm.name"
                  label="Nama Lengkap *"
                  outlined
                  dense
                  :rules="[val => !!val || 'Nama lengkap wajib diisi']"
                />
              </div>

              <!-- Email -->
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="userForm.email"
                  label="Email"
                  outlined
                  dense
                  type="email"
                />
              </div>

              <!-- Office/Kantor Selection -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="userForm.officeObj"
                  :options="officeOptions"
                  :option-label="opt => opt ? opt.kantor : ''"
                  label="Kantor Cabang"
                  outlined
                  dense
                  clearable
                />
              </div>

              <!-- Active status and Admin privilege toggles -->
              <div class="col-12 col-sm-6 row items-center justify-around">
                <div class="column items-center">
                  <span class="text-caption text-grey-7 q-mb-xs">Status Akun</span>
                  <q-btn-toggle
                    v-model="userForm.active"
                    toggle-color="primary"
                    flat
                    outlined
                    dense
                    :options="[
                      { label: 'Aktif', value: 'Y' },
                      { label: 'Non-aktif', value: 'N' }
                    ]"
                  />
                </div>

                <div class="column items-center">
                  <span class="text-caption text-grey-7 q-mb-xs">Administrator</span>
                  <q-toggle
                    v-model="userForm.isAdmin"
                    color="primary"
                    checked-icon="check"
                    unchecked-icon="close"
                  />
                </div>
              </div>

              <q-separator class="col-12 q-my-sm" />

              <!-- Role/Group assignments -->
              <div class="col-12">
                <div class="text-subtitle2 text-bold q-mb-xs font-outfit text-dark">Peran Kelompok / Role Groups Assignment:</div>
                <div class="row q-col-gutter-xs">
                  <div
                    v-for="group in groupsList"
                    :key="group.group_id"
                    class="col-12 col-sm-6"
                  >
                    <q-checkbox
                      v-model="userForm.group_ids"
                      :val="group.group_id"
                      :label="group.description"
                      color="indigo-9"
                    />
                  </div>
                </div>
              </div>

            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md bg-grey-1">
            <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
            <q-btn
              type="submit"
              label="Simpan User"
              color="primary"
              class="q-px-lg"
              no-caps
              :loading="savingUser"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { api } from 'boot/axios'
import { Notify, Dialog } from 'quasar'

// Active tab
const tab = ref('users')

// UI States
const loading = ref(false)
const savingUser = ref(false)
const savingPermissions = ref(false)

// Query params & data lists
const search = ref('')
const usersList = ref([])
const groupsList = ref([])
const officeOptions = ref([])

// Pagination state
const pagination = ref({
  sortBy: 'name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

// Columns for Users Table
const columns = [
  { name: 'login', label: 'Username (Login)', field: 'login', align: 'left', sortable: true },
  { name: 'name', label: 'Nama Lengkap', field: 'name', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'office', label: 'Kantor', field: 'office', align: 'left', sortable: true },
  { name: 'active', label: 'Status', field: 'active', align: 'center', sortable: true },
  { name: 'priv_admin', label: 'Admin', field: 'priv_admin', align: 'center', sortable: true },
  { name: 'groups', label: 'Peran Kelompok', field: 'group_ids', align: 'left' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' }
]

// Add/Edit Dialog states
const userDialog = reactive({
  open: false,
  isEdit: false
})

// User Form state
const userForm = reactive({
  login: '',
  pswd: '',
  name: '',
  email: '',
  officeObj: null,
  active: 'Y',
  isAdmin: false,
  group_ids: []
})

// RBAC Permissions states
const selectedGroupId = ref(null)
const permissionConfig = reactive({
  modules: [],
  permissions: {}
})

// Find currently selected group object
const selectedGroupObj = computed(() => {
  return groupsList.value.find(g => g.group_id === selectedGroupId.value)
})

// Map office IDs to labels
const getOfficeLabel = (officeId) => {
  if (!officeId) return '-'
  const office = officeOptions.value.find(o => String(o.officeid) === String(officeId))
  return office ? office.kantor : officeId
}

// Map group IDs to labels
const getGroupLabel = (groupId) => {
  const group = groupsList.value.find(g => g.group_id === groupId)
  return group ? group.description : `ID ${groupId}`
}

// Load users list with server-side pagination
const fetchUsers = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const params = {
      page,
      limit,
      search: search.value || undefined
    }
    const response = await api.get('/admin/users', { params })
    usersList.value = response.data.data
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit
    pagination.value.rowsNumber = response.data.total
  } catch (error) {
    console.error(error)
    Notify.create({ type: 'negative', message: 'Gagal memuat daftar pengguna' })
  } finally {
    loading.value = false
  }
}

// Reset page to 1 and fetch again
const resetPageAndFetch = () => {
  pagination.value.page = 1
  fetchUsers(1, pagination.value.rowsPerPage)
}

// Handle pagination request from table
const onTableRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  fetchUsers(page, rowsPerPage)
}

// Fetch all active offices for select options
const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
  } catch (error) {
    console.error(error)
  }
}

// Fetch all groups/roles available
const fetchGroups = async () => {
  try {
    const response = await api.get('/admin/groups')
    groupsList.value = response.data
  } catch (error) {
    console.error(error)
  }
}

// Open Dialog to add user
const openAddDialog = () => {
  userDialog.isEdit = false
  userForm.login = ''
  userForm.pswd = ''
  userForm.name = ''
  userForm.email = ''
  userForm.officeObj = null
  userForm.active = 'Y'
  userForm.isAdmin = false
  userForm.group_ids = []
  userDialog.open = true
}

// Open Dialog to edit user
const openEditDialog = (user) => {
  userDialog.isEdit = true
  userForm.login = user.login
  userForm.pswd = '' // Leave empty by default
  userForm.name = user.name || ''
  userForm.email = user.email || ''
  userForm.officeObj = officeOptions.value.find(o => String(o.officeid) === String(user.office)) || null
  userForm.active = user.active || 'Y'
  userForm.isAdmin = user.priv_admin === 'Y'
  userForm.group_ids = [...(user.group_ids || [])]
  userDialog.open = true
}

// Create or update user details
const saveUser = async () => {
  savingUser.value = true
  try {
    const payload = {
      pswd: userForm.pswd || undefined,
      name: userForm.name,
      email: userForm.email || '',
      office: userForm.officeObj ? userForm.officeObj.officeid : null,
      active: userForm.active,
      priv_admin: userForm.isAdmin ? 'Y' : '',
      group_ids: userForm.group_ids
    }

    if (userDialog.isEdit) {
      await api.put(`/admin/users/${userForm.login}`, payload)
      Notify.create({ type: 'positive', message: 'User berhasil diperbarui' })
    } else {
      payload.login = userForm.login
      await api.post('/admin/users', payload)
      Notify.create({ type: 'positive', message: 'User baru berhasil dibuat' })
    }

    userDialog.open = false
    fetchUsers(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    console.error(error)
    const msg = error.response?.data?.message || 'Gagal menyimpan user'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    savingUser.value = false
  }
}

// Delete user confirm dialog
const confirmDelete = (user) => {
  Dialog.create({
    title: 'Hapus User',
    message: `Apakah Anda yakin ingin menghapus akun user "${user.name || user.login}"? Tindakan ini tidak dapat dibatalkan.`,
    persistent: true,
    ok: {
      color: 'negative',
      label: 'Hapus',
      flat: false,
      noCaps: true
    },
    cancel: {
      color: 'grey-7',
      label: 'Batal',
      flat: true,
      noCaps: true
    }
  }).onOk(async () => {
    try {
      await api.delete(`/admin/users/${user.login}`)
      Notify.create({ type: 'positive', message: 'User berhasil dihapus' })
      fetchUsers(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.message || 'Gagal menghapus user'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

// Select a group to load its permissions
const selectGroup = async (groupId) => {
  selectedGroupId.value = groupId
  try {
    const response = await api.get(`/admin/groups/${groupId}/permissions`)
    permissionConfig.modules = response.data.modules
    permissionConfig.permissions = response.data.permissions
  } catch (error) {
    console.error(error)
    Notify.create({ type: 'negative', message: 'Gagal memuat hak akses kelompok' })
  }
}

const onAccessChange = (appName, hasAccess) => {
  if (!hasAccess && permissionConfig.permissions[appName]) {
    permissionConfig.permissions[appName].insert = false
    permissionConfig.permissions[appName].update = false
    permissionConfig.permissions[appName].delete = false
  }
}

// Save permissions configurations for selected group
const saveGroupPermissions = async () => {
  if (!selectedGroupId.value) return
  savingPermissions.value = true
  try {
    await api.post(`/admin/groups/${selectedGroupId.value}/permissions`, {
      permissions: permissionConfig.permissions
    })
    Notify.create({ type: 'positive', message: 'Konfigurasi hak akses berhasil disimpan' })
  } catch (error) {
    console.error(error)
    Notify.create({ type: 'negative', message: 'Gagal menyimpan konfigurasi hak akses' })
  } finally {
    savingPermissions.value = false
  }
}

// Fetch resources on mount
onMounted(async () => {
  await fetchOffices()
  await fetchGroups()
  await fetchUsers(1, 10)
})

// Watch tab variable to automatically select first group if switched to permissions tab
watch(tab, (newTab) => {
  if (newTab === 'permissions' && groupsList.value.length > 0 && !selectedGroupId.value) {
    selectGroup(groupsList.value[0].group_id)
  }
})
</script>

<style scoped>
.border-card {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
}
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.rounded-borders {
  border-radius: 8px !important;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
.qurban-table :deep(thead tr th) {
  font-weight: bold;
  background-color: #fafafa;
  color: #1e293b;
  font-family: 'Outfit', sans-serif;
}
</style>
