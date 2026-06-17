<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-primary q-my-none">Manajemen Mustahik</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Daftar calon dan penerima manfaat donasi program BMH</p>
      </div>
      <div>
        <q-btn
          color="primary"
          icon="add"
          label="Tambah Mustahik"
          class="rounded-borders text-bold q-py-sm"
          no-caps
          @click="openAddDialog"
        />
      </div>
    </div>

    <!-- Map & Table Section -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Left: Interactive Map & Recap -->
      <div class="col-12 col-md-5">
        <div class="sticky-map-card" :class="{ 'sticky-map-card-expanded': isMapExpanded }">
          <q-card class="bg-white q-pa-md border-card" :class="{ 'map-card-expanded': isMapExpanded }">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle1 text-weight-bold text-dark font-outfit">
                <q-icon name="map" color="primary" class="q-mr-xs" />
                Sebaran Geografis Mustahik
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
            <div id="mustahik-mgmt-map" class="map-container rounded-borders" style="height: 360px;"></div>
          </q-card>

          <!-- Mustahik Recapitulation Card -->
          <q-card class="bg-white q-pa-md border-card q-mt-md" v-if="!isMapExpanded">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-subtitle1 text-weight-bold text-dark font-outfit">
                <q-icon name="analytics" color="primary" class="q-mr-xs" size="22px" />
                Rekapitulasi Mustahik
              </div>
              <q-btn
                v-if="filters.asnaf || filters.tipe || filters.umum_khusus || filters.kelamin"
                flat
                dense
                color="red"
                icon="filter_alt_off"
                label="Reset Filter"
                size="sm"
                no-caps
                @click="clearAllRecapFilters"
              />
            </div>

            <q-tabs
              v-model="recapTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
            >
              <q-tab name="asnaf">
                <div class="row items-center no-wrap gap-xs">
                  <span class="q-mr-xs">Asnaf ({{ recapTotals.asnaf }})</span>
                  <q-icon name="filter_alt" size="14px" color="blue" v-if="filters.asnaf" />
                </div>
              </q-tab>
              <q-tab name="tipe">
                <div class="row items-center no-wrap gap-xs">
                  <span class="q-mr-xs">Tipe ({{ recapTotals.tipe }})</span>
                  <q-icon name="filter_alt" size="14px" color="teal" v-if="filters.tipe" />
                </div>
              </q-tab>
              <q-tab name="umum_khusus">
                <div class="row items-center no-wrap gap-xs">
                  <span class="q-mr-xs">Sifat ({{ recapTotals.umumKhusus }})</span>
                  <q-icon name="filter_alt" size="14px" color="indigo" v-if="filters.umum_khusus" />
                </div>
              </q-tab>
              <q-tab name="kelamin">
                <div class="row items-center no-wrap gap-xs">
                  <span class="q-mr-xs">Gender ({{ recapTotals.kelamin }})</span>
                  <q-icon name="filter_alt" size="14px" color="orange" v-if="filters.kelamin" />
                </div>
              </q-tab>
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="recapTab" animated class="bg-transparent q-mt-sm">
              <!-- Asnaf Panel -->
              <q-tab-panel name="asnaf" class="q-pa-none">
                <div v-if="recapData.asnaf.length > 0">
                  <div class="row items-center justify-between q-pa-sm q-mb-sm rounded-borders bg-blue-1 text-blue-9 text-bold">
                    <span class="text-subtitle2 font-outfit">
                      Total Mustahik
                      <span class="text-caption text-weight-regular q-ml-xs" v-if="filters.asnaf">(Filter: {{ filters.asnaf }})</span>
                    </span>
                    <div class="row items-center no-wrap">
                      <span>{{ recapTotals.asnaf }}</span>
                      <q-btn flat round dense icon="close" size="xs" color="blue-9" class="q-ml-sm" v-if="filters.asnaf" @click.stop="toggleRecapFilter('asnaf', filters.asnaf)">
                        <q-tooltip>Bersihkan Filter</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <q-list dense separator>
                    <q-item
                      v-for="item in recapData.asnaf"
                      :key="item.name"
                      class="q-py-sm cursor-pointer rounded-borders"
                      :class="{ 'bg-blue-1 text-blue-9 text-bold': filters.asnaf === item.name }"
                      clickable
                      @click="toggleRecapFilter('asnaf', item.name)"
                    >
                      <q-item-section avatar v-if="filters.asnaf === item.name" style="min-width: 24px;">
                        <q-icon name="check" color="blue" size="xs" />
                      </q-item-section>
                      <q-item-section>
                        <span class="text-grey-8 text-weight-medium" :class="{ 'text-blue-9': filters.asnaf === item.name }">{{ item.name }}</span>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="filters.asnaf === item.name ? 'blue-9' : 'blue-1'" :text-color="filters.asnaf === item.name ? 'white' : 'blue-9'" class="text-bold q-px-sm q-py-xs">
                          {{ item.count }} Mustahik
                        </q-badge>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div v-else class="text-center text-grey-5 q-py-md">Tidak ada data</div>
              </q-tab-panel>

              <!-- Tipe Panel -->
              <q-tab-panel name="tipe" class="q-pa-none">
                <div v-if="recapData.tipe.length > 0">
                  <div class="row items-center justify-between q-pa-sm q-mb-sm rounded-borders bg-teal-1 text-teal-9 text-bold">
                    <span class="text-subtitle2 font-outfit">
                      Total Mustahik
                      <span class="text-caption text-weight-regular q-ml-xs" v-if="filters.tipe">(Filter: {{ filters.tipe }})</span>
                    </span>
                    <div class="row items-center no-wrap">
                      <span>{{ recapTotals.tipe }}</span>
                      <q-btn flat round dense icon="close" size="xs" color="teal-9" class="q-ml-sm" v-if="filters.tipe" @click.stop="toggleRecapFilter('tipe', filters.tipe)">
                        <q-tooltip>Bersihkan Filter</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <q-list dense separator>
                    <q-item
                      v-for="item in recapData.tipe"
                      :key="item.name"
                      class="q-py-sm cursor-pointer rounded-borders"
                      :class="{ 'bg-teal-1 text-teal-9 text-bold': filters.tipe === item.name }"
                      clickable
                      @click="toggleRecapFilter('tipe', item.name)"
                    >
                      <q-item-section avatar v-if="filters.tipe === item.name" style="min-width: 24px;">
                        <q-icon name="check" color="teal" size="xs" />
                      </q-item-section>
                      <q-item-section>
                        <span class="text-grey-8 text-weight-medium" :class="{ 'text-teal-9': filters.tipe === item.name }">{{ item.name }}</span>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="filters.tipe === item.name ? 'teal-9' : 'teal-1'" :text-color="filters.tipe === item.name ? 'white' : 'teal-9'" class="text-bold q-px-sm q-py-xs">
                          {{ item.count }} Mustahik
                        </q-badge>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div v-else class="text-center text-grey-5 q-py-md">Tidak ada data</div>
              </q-tab-panel>

              <!-- Sifat Panel -->
              <q-tab-panel name="umum_khusus" class="q-pa-none">
                <div v-if="recapData.umumKhusus.length > 0">
                  <div class="row items-center justify-between q-pa-sm q-mb-sm rounded-borders bg-indigo-1 text-indigo-9 text-bold">
                    <span class="text-subtitle2 font-outfit">
                      Total Mustahik
                      <span class="text-caption text-weight-regular q-ml-xs" v-if="filters.umum_khusus">(Filter: {{ filters.umum_khusus }})</span>
                    </span>
                    <div class="row items-center no-wrap">
                      <span>{{ recapTotals.umumKhusus }}</span>
                      <q-btn flat round dense icon="close" size="xs" color="indigo-9" class="q-ml-sm" v-if="filters.umum_khusus" @click.stop="toggleRecapFilter('umum_khusus', filters.umum_khusus)">
                        <q-tooltip>Bersihkan Filter</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <q-list dense separator>
                    <q-item
                      v-for="item in recapData.umumKhusus"
                      :key="item.name"
                      class="q-py-sm cursor-pointer rounded-borders"
                      :class="{ 'bg-indigo-1 text-indigo-9 text-bold': filters.umum_khusus === item.name }"
                      clickable
                      @click="toggleRecapFilter('umum_khusus', item.name)"
                    >
                      <q-item-section avatar v-if="filters.umum_khusus === item.name" style="min-width: 24px;">
                        <q-icon name="check" color="indigo" size="xs" />
                      </q-item-section>
                      <q-item-section>
                        <span class="text-grey-8 text-weight-medium" :class="{ 'text-indigo-9': filters.umum_khusus === item.name }">{{ item.name }}</span>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="filters.umum_khusus === item.name ? 'indigo-9' : 'indigo-1'" :text-color="filters.umum_khusus === item.name ? 'white' : 'indigo-9'" class="text-bold q-px-sm q-py-xs">
                          {{ item.count }} Mustahik
                        </q-badge>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div v-else class="text-center text-grey-5 q-py-md">Tidak ada data</div>
              </q-tab-panel>

              <!-- Gender Panel -->
              <q-tab-panel name="kelamin" class="q-pa-none">
                <div v-if="recapData.kelamin.length > 0">
                  <div class="row items-center justify-between q-pa-sm q-mb-sm rounded-borders bg-orange-1 text-orange-9 text-bold">
                    <span class="text-subtitle2 font-outfit">
                      Total Mustahik
                      <span class="text-caption text-weight-regular q-ml-xs" v-if="filters.kelamin">(Filter: {{ filters.kelamin }})</span>
                    </span>
                    <div class="row items-center no-wrap">
                      <span>{{ recapTotals.kelamin }}</span>
                      <q-btn flat round dense icon="close" size="xs" color="orange-9" class="q-ml-sm" v-if="filters.kelamin" @click.stop="toggleRecapFilter('kelamin', filters.kelamin)">
                        <q-tooltip>Bersihkan Filter</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <q-list dense separator>
                    <q-item
                      v-for="item in recapData.kelamin"
                      :key="item.name"
                      class="q-py-sm cursor-pointer rounded-borders"
                      :class="{ 'bg-orange-1 text-orange-9 text-bold': filters.kelamin === item.name }"
                      clickable
                      @click="toggleRecapFilter('kelamin', item.name)"
                    >
                      <q-item-section avatar v-if="filters.kelamin === item.name" style="min-width: 24px;">
                        <q-icon name="check" color="orange" size="xs" />
                      </q-item-section>
                      <q-item-section>
                        <span class="text-grey-8 text-weight-medium" :class="{ 'text-orange-9': filters.kelamin === item.name }">{{ item.name }}</span>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="filters.kelamin === item.name ? 'orange-9' : 'orange-1'" :text-color="filters.kelamin === item.name ? 'white' : 'orange-9'" class="text-bold q-px-sm q-py-xs">
                          {{ item.count }} Mustahik
                        </q-badge>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div v-else class="text-center text-grey-5 q-py-md">Tidak ada data</div>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </div>
      </div>

      <!-- Right: Datatable -->
      <div class="col-12 col-md-7">
        <q-card class="bg-white q-pa-md border-card">
          <!-- Search Filters -->
          <div class="row q-col-gutter-sm q-mb-md">
            <!-- Row 1 -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="filters.name"
                label="Cari Nama Mustahik"
                outlined
                dense
                clearable
                @update:model-value="resetPageAndFetch"
              >
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-4 col-sm-2">
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
            <div class="col-4 col-sm-2">
              <q-select
                v-model="filters.status"
                :options="['ON', 'OFF']"
                label="Status"
                outlined
                dense
                clearable
                @update:model-value="resetPageAndFetch"
              />
            </div>
            <div class="col-4 col-sm-2">
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

            <!-- Row 2: Provinsi & Kab/Kota -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="filters.prov"
                :options="provinceOptions"
                label="Provinsi"
                outlined
                dense
                clearable
                @update:model-value="resetPageAndFetch"
              >
                <template v-slot:prepend>
                  <q-icon name="map" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="filters.kab"
                label="Kabupaten / Kota"
                outlined
                dense
                clearable
                @update:model-value="resetPageAndFetch"
              >
                <template v-slot:prepend>
                  <q-icon name="location_city" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- Mustahik Table -->
          <q-table
            :rows="mustahikList"
            :columns="columns"
            row-key="IDM"
            :loading="loading"
            v-model:pagination="pagination"
            @request="onTableRequest"
            binary-state-sort
            flat
            bordered
            class="mustahik-table rounded-borders"
            :grid="$q.screen.xs"
          >
            <!-- Grid item for mobile view -->
            <template v-slot:item="props">
              <div class="q-pa-xs col-12 col-sm-6">
                <q-card class="bg-white border-card q-pa-sm">
                  <q-card-section class="q-pb-sm">
                    <div class="row items-center justify-between no-wrap">
                      <div class="text-subtitle1 text-weight-bold text-dark ellipsis">{{ props.row.NAMA_MUSTAHIK }}</div>
                      <q-badge :color="props.row.STATUS_AKTIF === 'ON' ? 'positive' : 'negative'" class="q-py-xs q-px-sm">
                        {{ props.row.STATUS_AKTIF }}
                      </q-badge>
                    </div>
                    <div class="text-caption text-grey-6 q-mb-xs">IDM: {{ props.row.IDM }}</div>
                    <div class="text-caption text-primary text-bold">Asnaf: {{ props.row.ASNAF || 'Umum' }}</div>
                  </q-card-section>
                  <q-separator />
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-8">
                      <q-icon name="place" color="red" class="q-mr-xs" />
                      {{ props.row.ALAMAT }}
                    </div>
                    <div class="text-caption text-grey-5 q-ml-md">
                      {{ props.row.KEL }}, {{ props.row.KEC }}, {{ props.row.KAB }}, {{ props.row.PROV }}
                    </div>
                    <div class="text-caption text-grey-7 q-mt-xs">
                      <q-icon name="apartment" class="q-mr-xs" />
                      Kantor: {{ props.row.KANTOR }}
                    </div>
                  </q-card-section>
                  <q-separator />
                  <q-card-actions align="right" class="q-py-xs">
                    <q-btn flat round color="blue" icon="gps_fixed" size="sm" @click="flyToMarker(props.row)">
                      <q-tooltip>Lihat di Peta</q-tooltip>
                    </q-btn>
                    <q-btn flat round color="secondary" icon="edit" size="sm" @click="openEditDialog(props.row)" :disable="!canModify(props.row)">
                      <q-tooltip>Ubah</q-tooltip>
                    </q-btn>
                    <q-btn flat round color="red" icon="delete" size="sm" @click="confirmDelete(props.row)" :disable="!canModify(props.row)">
                      <q-tooltip>Hapus</q-tooltip>
                    </q-btn>
                  </q-card-actions>
                </q-card>
              </div>
            </template>

            <!-- Custom columns rendering -->
            <template v-slot:body-cell-NAMA_MUSTAHIK="props">
              <q-td :props="props">
                <div class="text-weight-bold text-dark">{{ props.row.NAMA_MUSTAHIK }}</div>
                <div class="text-caption text-grey-6">{{ props.row.IDM }}</div>
              </q-td>
            </template>

            <template v-slot:body-cell-ALAMAT="props">
              <q-td :props="props" style="white-space: normal; min-width: 180px; max-width: 280px; word-break: break-word;">
                <div class="text-dark">{{ props.row.ALAMAT }}</div>
                <div class="text-caption text-grey-6">{{ props.row.KEL }}, {{ props.row.KEC }}, {{ props.row.KAB }}, {{ props.row.PROV }}</div>
              </q-td>
            </template>

            <template v-slot:body-cell-STATUS_AKTIF="props">
              <q-td :props="props" align="center">
                <q-badge :color="props.row.STATUS_AKTIF === 'ON' ? 'positive' : 'negative'" class="q-py-xs q-px-sm">
                  {{ props.row.STATUS_AKTIF }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-action="props">
              <q-td :props="props" align="center">
                <q-btn flat round dense color="grey-7" icon="more_vert">
                  <q-menu auto-close anchor="bottom right" self="top right">
                    <q-list style="min-width: 140px">
                      <!-- Locate on Map Item -->
                      <q-item clickable v-ripple @click="flyToMarker(props.row)">
                        <q-item-section avatar style="min-width: 36px;">
                          <q-icon name="gps_fixed" color="blue" size="20px" />
                        </q-item-section>
                        <q-item-section>Lihat Peta</q-item-section>
                      </q-item>
                      
                      <!-- Edit Item -->
                      <q-item
                        clickable
                        v-ripple
                        @click="openEditDialog(props.row)"
                        :disable="!canModify(props.row)"
                      >
                        <q-item-section avatar style="min-width: 36px;">
                          <q-icon name="edit" color="secondary" size="20px" />
                        </q-item-section>
                        <q-item-section>Ubah</q-item-section>
                      </q-item>
                      
                      <!-- Delete Item -->
                      <q-item
                        clickable
                        v-ripple
                        @click="confirmDelete(props.row)"
                        :disable="!canModify(props.row)"
                        class="text-red"
                      >
                        <q-item-section avatar style="min-width: 36px;">
                          <q-icon name="delete" color="red" size="20px" />
                        </q-item-section>
                        <q-item-section>Hapus</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

    <!-- Add/Edit Mustahik Dialog -->
    <q-dialog v-model="dialog.open" persistent>
      <q-card style="width: 700px; max-width: 90vw;" class="rounded-borders">
        <q-card-section class="row items-center bg-primary text-white q-py-sm">
          <div class="text-h6 text-bold">{{ dialog.isEdit ? 'Ubah Mustahik' : 'Tambah Mustahik' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="saveMustahik">
          <q-card-section class="scroll" style="max-height: 60vh;">
            <div class="row q-col-gutter-sm">
              <!-- Name & Gender -->
              <div class="col-12 col-sm-8">
                <q-input v-model="form.NAMA_MUSTAHIK" label="Nama Lengkap Mustahik *" outlined dense :rules="[val => !!val || 'Wajib diisi']" />
              </div>
              <div class="col-12 col-sm-4">
                <q-select v-model="form.KELAMIN" :options="['Laki-laki', 'Perempuan']" label="Kelamin" outlined dense />
              </div>

              <!-- HP & Email -->
              <div class="col-12 col-sm-6">
                <q-input v-model="form.HP" label="No. Handphone" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.EMAIL" label="Email" outlined dense />
              </div>

              <!-- Place & Date of birth -->
              <div class="col-12 col-sm-6">
                <q-input v-model="form.TEMPAT_LAHIR" label="Tempat Lahir" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.TGL_LAHIR" label="Tanggal Lahir" type="date" outlined dense stack-label />
              </div>

              <!-- NKK & NIK -->
              <div class="col-12 col-sm-6">
                <q-input v-model="form.NKK" label="No. Kartu Keluarga (NKK)" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.NIK_SIUP" label="NIK / SIUP" outlined dense />
              </div>

              <!-- Asnaf & Penerima Manfaat Count -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.ASNAF"
                  :options="['Fakir', 'Miskin', 'Amil', 'Mualaf', 'Riqab', 'Gharim', 'Fisabilillah', 'Ibnu Sabil']"
                  label="Kategori Asnaf"
                  outlined
                  dense
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model.number="form.PENERIMA_MANFAAT" label="Jumlah PM (Jiwa)" type="number" outlined dense :rules="[val => val >= 1 || 'Minimal 1']" />
              </div>

              <!-- Address Fields -->
              <div class="col-12">
                <q-input v-model="form.ALAMAT" label="Alamat Jalan/No *" outlined dense :rules="[val => !!val || 'Wajib diisi']" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.KEL" label="Kelurahan" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.KEC" label="Kecamatan" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.KAB" label="Kota / Kabupaten *" outlined dense :rules="[val => !!val || 'Wajib diisi']" />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.PROV"
                  :options="provinceOptions"
                  label="Provinsi *"
                  outlined
                  dense
                  :rules="[val => !!val || 'Wajib diisi']"
                />
              </div>

              <!-- Office & Status -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.KANTOR"
                  :options="officeOptions"
                  option-label="kantor"
                  option-value="officeid"
                  label="Kantor Penyalur *"
                  outlined
                  dense
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Wajib diisi']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select v-model="form.STATUS_AKTIF" :options="['ON', 'OFF']" label="Status Aktif" outlined dense />
              </div>

              <div class="col-12">
                <q-input v-model="form.NOTES" label="Catatan Tambahan" type="textarea" rows="3" outlined dense />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
            <q-btn type="submit" :label="dialog.isEdit ? 'Simpan Perubahan' : 'Tambah Baru'" color="primary" class="q-px-lg" no-caps />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import { Notify, Dialog } from 'quasar'
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
  name: '',
  status: 'ON',
  office: authStore.user?.office || null,
  prov: null,
  kab: '',
  year: new Date().getFullYear(),
  asnaf: null,
  tipe: null,
  umum_khusus: null,
  kelamin: null
})

const mapItemsList = ref([])
const recapTab = ref('asnaf')

const recapData = computed(() => {
  const list = mapItemsList.value
  
  const asnafMap = {}
  const tipeMap = {}
  const umumKhususMap = {}
  const kelaminMap = {}

  list.forEach(item => {
    // Asnaf
    const a = item.asnaf || 'Tidak Ditentukan'
    asnafMap[a] = (asnafMap[a] || 0) + 1

    // Tipe
    const t = item.tipe || 'Tidak Ditentukan'
    tipeMap[t] = (tipeMap[t] || 0) + 1

    // Sifat
    const uk = item.umum_khusus || 'Tidak Ditentukan'
    umumKhususMap[uk] = (umumKhususMap[uk] || 0) + 1

    // Kelamin
    const k = item.kelamin || 'Tidak Ditentukan'
    kelaminMap[k] = (kelaminMap[k] || 0) + 1
  })

  const toSortedArray = (map) => {
    return Object.entries(map).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count)
  }

  return {
    asnaf: toSortedArray(asnafMap),
    tipe: toSortedArray(tipeMap),
    umumKhusus: toSortedArray(umumKhususMap),
    kelamin: toSortedArray(kelaminMap)
  }
})

const recapTotals = computed(() => {
  const asnafTotal = recapData.value.asnaf.reduce((sum, item) => sum + item.count, 0)
  const tipeTotal = recapData.value.tipe.reduce((sum, item) => sum + item.count, 0)
  const umumKhususTotal = recapData.value.umumKhusus.reduce((sum, item) => sum + item.count, 0)
  const kelaminTotal = recapData.value.kelamin.reduce((sum, item) => sum + item.count, 0)
  return {
    asnaf: asnafTotal,
    tipe: tipeTotal,
    umumKhusus: umumKhususTotal,
    kelamin: kelaminTotal
  }
})

const toggleRecapFilter = (key, val) => {
  if (filters[key] === val) {
    filters[key] = null
  } else {
    filters[key] = val
  }
  resetPageAndFetch()
}

const clearAllRecapFilters = () => {
  filters.asnaf = null
  filters.tipe = null
  filters.umum_khusus = null
  filters.kelamin = null
  resetPageAndFetch()
}

const loading = ref(false)
const mustahikList = ref([])
const officeOptions = ref([])

const pagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'NAMA_MUSTAHIK', label: 'Nama Mustahik', field: 'NAMA_MUSTAHIK', align: 'left', sortable: true },
  { name: 'ASNAF', label: 'Asnaf', field: 'ASNAF', align: 'left', sortable: true },
  { name: 'ALAMAT', label: 'Alamat', field: 'ALAMAT', align: 'left' },
  { name: 'KANTOR', label: 'Kantor', field: 'KANTOR', align: 'left' },
  { name: 'STATUS_AKTIF', label: 'Status', field: 'STATUS_AKTIF', align: 'center' },
  { name: 'action', label: 'Aksi', align: 'center' }
]

const provinceOptions = [
  'DKI JAKARTA', 'JAWA BARAT', 'JAWA TENGAH', 'JAWA TIMUR', 'DI YOGYAKARTA', 'BANTEN',
  'BALI', 'SULAWESI SELATAN', 'SUMATERA UTARA', 'SUMATERA BARAT', 'KALIMANTAN TIMUR', 'PAPUA'
]

// Modal Form State
const dialog = reactive({
  open: false,
  isEdit: false,
  targetId: null
})

const form = reactive({
  NAMA_MUSTAHIK: '',
  KELAMIN: 'Laki-laki',
  HP: '',
  EMAIL: '',
  TEMPAT_LAHIR: '',
  TGL_LAHIR: '',
  NKK: '',
  NIK_SIUP: '',
  ASNAF: 'Miskin',
  PENERIMA_MANFAAT: 1,
  ALAMAT: '',
  KEL: '',
  KEC: '',
  KAB: '',
  PROV: '',
  KANTOR: '',
  STATUS_AKTIF: 'ON',
  NOTES: ''
})

let mapInstance = null
let markerGroup = null
const markersMap = {} // store markers by Mustahik ID

// Check if user can modify/delete the record based on office hierarchy
const canModify = (row) => {
  if (authStore.isAdmin) return true
  const userOff = authStore.user?.office || ''
  const rowOff = row.KANTOR || ''
  return rowOff.startsWith(userOff)
}

// Fetch offices for dropdowns
const fetchOffices = async () => {
  try {
    const response = await api.get('/offices')
    officeOptions.value = response.data
  } catch (error) {
    console.error('Fetch offices dropdown failed:', error)
  }
}

// Fetch list from API
const fetchMustahik = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/mustahik', {
      params: {
        name: filters.name || undefined,
        status_aktif: filters.status || undefined,
        office: filters.office || undefined,
        prov: filters.prov || undefined,
        kab: filters.kab || undefined,
        year: filters.year || undefined,
        asnaf: filters.asnaf || undefined,
        tipe: filters.tipe || undefined,
        umum_khusus: filters.umum_khusus || undefined,
        kelamin: filters.kelamin || undefined,
        page,
        limit
      }
    })

    mustahikList.value = response.data.data
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.page
    pagination.value.rowsPerPage = response.data.limit

    // Update map points by fetching ALL matching mustahik coordinates
    await fetchMapPoints()
  } catch (error) {
    console.error('Fetch mustahik list failed:', error)
    Notify.create({ type: 'negative', message: 'Gagal mengambil data mustahik' })
  } finally {
    loading.value = false
  }
}

const fetchMapPoints = async () => {
  try {
    const response = await api.get('/mustahik/map', {
      params: {
        name: filters.name || undefined,
        status_aktif: filters.status || undefined,
        office: filters.office || undefined,
        prov: filters.prov || undefined,
        kab: filters.kab || undefined,
        year: filters.year || undefined,
        asnaf: filters.asnaf || undefined,
        tipe: filters.tipe || undefined,
        umum_khusus: filters.umum_khusus || undefined,
        kelamin: filters.kelamin || undefined
      }
    })
    mapItemsList.value = response.data
    renderMapPoints(response.data)
  } catch (error) {
    console.error('Fetch mustahik map failed:', error)
  }
}

const resetPageAndFetch = () => {
  pagination.value.page = 1
  fetchMustahik(1, pagination.value.rowsPerPage)
}

const onTableRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  fetchMustahik(page, rowsPerPage)
}

// Leaflet Map Helpers
const initMap = () => {
  if (mapInstance) return

  mapInstance = L.map('mustahik-mgmt-map').setView([-2.5489, 118.0149], 5)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance)
}

const renderMapPoints = (points) => {
  if (!mapInstance || !markerGroup || !L) return

  markerGroup.clearLayers()
  // Reset markers object
  for (const k in markersMap) delete markersMap[k]

  if (points.length === 0) return

  const bounds = L.latLngBounds()

  points.forEach(pt => {
    if (!pt.lat || !pt.lng) return

    const customIcon = L.divIcon({
      html: '<div class="map-pin" style="background-color: #2196f3;"></div>',
      className: 'custom-leaflet-pin',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })

    const marker = L.marker([pt.lat, pt.lng], { icon: customIcon })
    const name = pt.NAMA_MUSTAHIK || pt.name || ''
    const asnaf = pt.ASNAF || pt.asnaf || 'Umum'
    const officeName = pt.KANTOR || pt.office || ''
    const addressStr = pt.address || `${pt.ALAMAT || ''}, Kel. ${pt.KEL || ''}, Kec. ${pt.KEC || ''}, ${pt.KAB || ''}`

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-title font-outfit">${name}</div>
        <div class="popup-info"><b>Asnaf:</b> ${asnaf}</div>
        <div class="popup-info"><b>Alamat:</b> ${addressStr}</div>
        <div class="popup-info"><b>Kantor:</b> ${officeName}</div>
      </div>
    `
    marker.bindPopup(popupContent)
    markerGroup.addLayer(marker)
    
    markersMap[pt.IDM || pt.id] = marker
    bounds.extend([pt.lat, pt.lng])
  })

  // Fit bounds dynamically if we have points
  if (points.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
  }
}

// Center map to selected mustahik and animate zoom
const flyToMarker = (row) => {
  const marker = markersMap[row.IDM || row.id]
  if (marker && mapInstance) {
    mapInstance.setView(marker.getLatLng(), 13, { animate: true })
    marker.openPopup()
  } else {
    Notify.create({ type: 'warning', message: 'Lokasi mustahik tidak terpetakan di map.' })
  }
}

// Dialog Add/Edit handlers
const openAddDialog = () => {
  dialog.isEdit = false
  dialog.open = true
  dialog.targetId = null
  
  // Reset fields
  form.NAMA_MUSTAHIK = ''
  form.KELAMIN = 'Laki-laki'
  form.HP = ''
  form.EMAIL = ''
  form.TEMPAT_LAHIR = ''
  form.TGL_LAHIR = ''
  form.NKK = ''
  form.NIK_SIUP = ''
  form.ASNAF = 'Miskin'
  form.PENERIMA_MANFAAT = 1
  form.ALAMAT = ''
  form.KEL = ''
  form.KEC = ''
  form.KAB = ''
  form.PROV = 'JAWA BARAT'
  form.KANTOR = authStore.user?.office || ''
  form.STATUS_AKTIF = 'ON'
  form.NOTES = ''
}

const openEditDialog = (row) => {
  dialog.isEdit = true
  dialog.open = true
  dialog.targetId = row.IDM
  
  // Pre-fill fields
  form.NAMA_MUSTAHIK = row.NAMA_MUSTAHIK || ''
  form.KELAMIN = row.KELAMIN || 'Laki-laki'
  form.HP = row.HP || ''
  form.EMAIL = row.EMAIL || ''
  form.TEMPAT_LAHIR = row.TEMPAT_LAHIR || ''
  form.TGL_LAHIR = row.TGL_LAHIR ? row.TGL_LAHIR.split('T')[0] : ''
  form.NKK = row.NKK || ''
  form.NIK_SIUP = row.NIK_SIUP || ''
  form.ASNAF = row.ASNAF || 'Miskin'
  form.PENERIMA_MANFAAT = row.PENERIMA_MANFAAT || 1
  form.ALAMAT = row.ALAMAT || ''
  form.KEL = row.KEL || ''
  form.KEC = row.KEC || ''
  form.KAB = row.KAB || ''
  form.PROV = row.PROV || ''
  form.KANTOR = row.KANTOR || ''
  form.STATUS_AKTIF = row.STATUS_AKTIF || 'ON'
  form.NOTES = row.NOTES || ''
}

const saveMustahik = async () => {
  try {
    if (dialog.isEdit) {
      await api.put(`/mustahik/${dialog.targetId}`, form)
      Notify.create({ type: 'positive', message: 'Data mustahik berhasil diubah' })
    } else {
      await api.post('/mustahik', form)
      Notify.create({ type: 'positive', message: 'Mustahik baru berhasil ditambahkan' })
    }
    dialog.open = false
    fetchMustahik(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menyimpan data mustahik'
    Notify.create({ type: 'negative', message: msg })
  }
}

const confirmDelete = (row) => {
  Dialog.create({
    title: 'Konfirmasi Hapus',
    message: `Apakah Anda yakin ingin menghapus data mustahik ${row.NAMA_MUSTAHIK}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/mustahik/${row.IDM}`)
      Notify.create({ type: 'positive', message: 'Data mustahik berhasil dihapus' })
      fetchMustahik(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menghapus mustahik'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

onMounted(async () => {
  await fetchOffices()
  initMap()
  await fetchMustahik(1, 10)
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="scss">
.sticky-map-card {
  position: sticky;
  top: 80px;
}

.sticky-map-card-expanded {
  z-index: 9999 !important;
}

.ellipsis-cell {
  max-width: 200px;
}

.mustahik-table {
  .q-table__thead {
    background-color: #fafafa;
    color: #424242;
    font-weight: bold;
  }
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
}
</style>
