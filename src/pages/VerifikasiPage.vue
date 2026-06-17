<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg q-col-gutter-sm">
      <div>
        <h1 class="text-h4 text-weight-bold font-outfit text-primary q-my-none">Verifikasi Penyaluran Donasi</h1>
        <p class="text-grey-7 q-my-none text-subtitle2">Proses verifikasi, persetujuan, dan pencairan bantuan mustahik</p>
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
            :options="['MASUK', 'OPEN', 'DITERIMA', 'DITOLAK', 'PROSES PENCAIRAN', 'FINISH']"
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
            
            <!-- Transition Buttons based on current status -->
            <div class="row q-gutter-xs" v-if="canModify(detailsDialog.data)">
              <q-btn
                v-if="detailsDialog.data.STATUS === 'MASUK'"
                color="blue"
                label="Buka Pengajuan (OPEN)"
                no-caps
                dense
                class="q-px-md text-bold"
                @click="transitionStatus(detailsDialog.data.IDTRANS, 'OPEN')"
              />
              <template v-if="detailsDialog.data.STATUS === 'MASUK' || detailsDialog.data.STATUS === 'OPEN'">
                <q-btn
                  color="positive"
                  label="Setujui (DITERIMA)"
                  no-caps
                  dense
                  class="q-px-md text-bold"
                  @click="handleApprove"
                />
                <q-btn
                  color="negative"
                  label="Tolak (DITOLAK)"
                  no-caps
                  dense
                  class="q-px-md text-bold"
                  @click="handleReject"
                />
              </template>
              <q-btn
                v-if="detailsDialog.data.STATUS === 'DITERIMA' || detailsDialog.data.STATUS === 'PROSES PENCAIRAN'"
                color="orange-9"
                label="Lakukan Pencairan"
                no-caps
                dense
                class="q-px-md text-bold"
                @click="openPayoutDialog(detailsDialog.data)"
              />
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

    <!-- Payout / Pencairan Dialog -->
    <q-dialog v-model="payoutDialog.open" persistent>
      <q-card style="width: 850px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="bg-primary text-white row items-center q-py-sm">
          <div class="text-h6 text-bold">Proses Pencairan Penyaluran</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="submitPayout">
          <q-card-section class="scroll" style="max-height: 70vh;">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">ID Transaksi</div>
                <div class="text-subtitle2 text-bold">{{ payoutDialog.idtrans }}</div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Nilai Disetujui (ACC)</div>
                <div class="text-subtitle2 text-bold text-indigo-9">{{ formatRupiah(payoutDialog.nilaiAcc) }}</div>
              </div>

              <q-separator class="col-12 q-my-sm" />

              <!-- TIPE_PENYALURAN -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="payoutDialog.tipePenyaluran"
                  :options="['PENDISTRIBUSIAN', 'PENDAYAGUNAAN']"
                  label="Tipe Penyaluran *"
                  outlined
                  dense
                  :rules="[val => !!val || 'Tipe penyaluran wajib diisi']"
                />
              </div>

              <!-- IDBAYAR selection (loaded from crm carabayar) -->
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="payoutDialog.idbayar"
                  :options="caraBayarOptions"
                  option-value="bayar_id"
                  option-label="cara_bayar"
                  label="Pilih Rekening / Cara Bayar *"
                  outlined
                  dense
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Cara pembayaran wajib diisi']"
                  @update:model-value="onPayoutIdbayarChange"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label class="text-bold text-dark">{{ scope.opt.cara_bayar }}</q-item-label>
                        <q-item-label caption class="text-grey-6">Tipe: {{ scope.opt.tipe_bayar }} | Akun: {{ scope.opt.akun }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-6 col-sm-4">
                <q-input v-model="payoutDialog.tipeBayar" label="Tipe Bayar" outlined dense readonly bg-color="grey-2" />
              </div>
              <div class="col-6 col-sm-8">
                <q-input v-model="payoutDialog.caraBayar" label="Cara Bayar" outlined dense readonly bg-color="grey-2" />
              </div>

              <!-- DOC_SALUR Uploader -->
              <div class="col-12 col-sm-6">
                <q-file
                  v-model="salurFile"
                  label="Upload Bukti Penyaluran (Foto) *"
                  outlined
                  dense
                  accept="image/*"
                  :loading="uploadingSalur"
                  @update:model-value="uploadFile"
                >
                  <template v-slot:prepend>
                    <q-icon name="photo_camera" />
                  </template>
                </q-file>
                <div v-if="payoutDialog.docSalur" class="q-mt-sm text-center">
                  <q-img :src="payoutDialog.docSalur" style="max-height: 120px; max-width: 120px; border-radius: 8px; border: 1px solid #ddd;" />
                </div>
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="payoutDialog.nilai"
                  type="text"
                  label="Total Realisasi Pencairan"
                  outlined
                  dense
                  readonly
                  bg-color="grey-2"
                  class="text-teal-9 text-bold"
                  :model-value="formatRupiah(totalRealisasi)"
                />
                <div class="text-caption text-red q-mt-xs" v-if="totalRealisasi > payoutDialog.nilaiAcc">
                  <q-icon name="warning" class="q-mr-xs" />
                  Nilai realisasi tidak boleh melebihi Nilai ACC ({{ formatRupiah(payoutDialog.nilaiAcc) }})!
                </div>
              </div>

              <q-separator class="col-12 q-my-sm" />

              <!-- Details dpenyaluran Sub-form -->
              <div class="col-12 row items-center justify-between q-mb-sm">
                <div class="text-subtitle2 text-bold text-dark font-outfit">Rincian Detail Program Penyaluran (dpenyaluran)</div>
                <q-btn size="sm" color="secondary" icon="add" label="Tambah Baris Detail" no-caps @click="addPayoutDetailRow" />
              </div>

              <div class="col-12">
                <div v-for="(row, index) in payoutDialog.details" :key="index" class="row q-col-gutter-xs items-center q-mb-sm bg-grey-1 q-pa-sm rounded-borders border">
                  <!-- Source of funds (Jenis Dana) -->
                  <div class="col-12 col-sm-4">
                    <q-select
                      v-model="row.jenisDanaObj"
                      :options="jenisDanaOptions"
                      :option-label="opt => opt ? `${opt.dana} - ${opt.sub_dana}` : ''"
                      label="Pilih Sumber Dana *"
                      outlined
                      dense
                      :rules="[val => !!val || 'Sumber dana wajib diisi']"
                      @update:model-value="onPayoutJenisDanaChange(index)"
                    />
                  </div>

                  <!-- Program dropdown selector (by Detail Program) -->
                  <div class="col-12 col-sm-4">
                    <q-select
                      v-model="row.programObj"
                      :options="filteredProgramOptions"
                      option-label="DETAIL_PRORAM"
                      label="Pilih Detail Program *"
                      outlined
                      dense
                      use-input
                      fill-input
                      hide-selected
                      :rules="[val => !!val || 'Detail program wajib diisi']"
                      @filter="filterProgram"
                      @update:model-value="onPayoutProgramChange(index)"
                    >
                      <template v-slot:no-option>
                        <q-item>
                          <q-item-section class="text-grey">
                            Tidak ada detail program ditemukan
                          </q-item-section>
                        </q-item>
                      </template>
                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section>
                            <q-item-label class="text-bold text-primary">{{ scope.opt.DETAIL_PRORAM }}</q-item-label>
                            <q-item-label caption class="text-grey-7">{{ scope.opt.PROGRAM_NAME }} - {{ scope.opt.SUB_PROGRAM }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>

                  <!-- Sub total amount -->
                  <div class="col-8 col-sm-3">
                    <q-input
                      v-model.number="row.SUB_TOTAL"
                      type="number"
                      label="Sub Total (Rp) *"
                      outlined
                      dense
                      :rules="[val => val > 0 || 'Harus lebih dari 0']"
                    />
                  </div>

                  <!-- Delete button -->
                  <div class="col-4 col-sm-1 text-center">
                    <q-btn flat round color="red" icon="delete" size="sm" @click="removePayoutDetailRow(index)" />
                  </div>

                  <div class="col-12 row q-col-gutter-xs q-mt-xs">
                    <div class="col-12">
                      <q-input
                        :model-value="row.programObj ? `${row.programObj.PROGRAM_NAME} - ${row.programObj.SUB_PROGRAM}` : '-'"
                        label="Program & Sub Program Terkait (Otomatis)"
                        outlined
                        dense
                        readonly
                        bg-color="grey-2"
                      />
                    </div>
                  </div>
                </div>
                <div v-if="payoutDialog.details.length === 0" class="text-center text-grey-5 q-py-md">
                  Belum ada detail program. Tambahkan minimal satu rincian detail program.
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Batal" color="grey-7" v-close-popup no-caps />
            <q-btn
              type="submit"
              label="Selesaikan & Cairkan"
              color="primary"
              class="q-px-lg"
              no-caps
              :disable="totalRealisasi === 0 || totalRealisasi > payoutDialog.nilaiAcc || payoutDialog.details.length === 0 || !payoutDialog.docSalur"
            />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import { Notify, Dialog } from 'quasar'

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
const programOptions = ref([])
const filteredProgramOptions = ref([])

// File Upload states
const salurFile = ref(null)
const uploadingSalur = ref(false)

// CRM & Source of funds options
const caraBayarOptions = ref([])
const jenisDanaOptions = ref([])

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

// Payout Dialog state
const payoutDialog = reactive({
  open: false,
  idtrans: null,
  nilaiAcc: 0,
  tipePenyaluran: 'PENDISTRIBUSIAN',
  idbayar: '',
  tipeBayar: '',
  caraBayar: '',
  docSalur: '',
  details: []
})

// Compute Payout total realisasi
const totalRealisasi = computed(() => {
  return payoutDialog.details.reduce((sum, row) => sum + parseFloat(row.SUB_TOTAL || 0), 0)
})

// Authorization check helpers
const canModify = (row) => {
  if (authStore.isAdmin) return true
  const userOff = authStore.user?.office || ''
  const rowOff = row.OFFICE || ''
  return rowOff.startsWith(userOff)
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

// Fetch payment options from CRM
const fetchCaraBayarOptions = async () => {
  try {
    const response = await api.get('/penyaluran/cara-bayar')
    caraBayarOptions.value = response.data
  } catch (error) {
    console.error('Fetch CRM payment options failed:', error)
  }
}

// Fetch source of funds (Jenis Dana)
const fetchJenisDanaOptions = async () => {
  try {
    const response = await api.get('/penyaluran/jenis-dana')
    jenisDanaOptions.value = response.data
  } catch (error) {
    console.error('Fetch Jenis Dana failed:', error)
  }
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

// Fetch programs for sub-form selection
const fetchPrograms = async () => {
  try {
    const response = await api.get('/penyaluran/programs')
    programOptions.value = response.data
    filteredProgramOptions.value = response.data
  } catch (error) {
    console.error('Fetch programs failed:', error)
  }
}

// Filter program options based on query search (auto-suggest)
const filterProgram = (val, update) => {
  if (val === '') {
    update(() => {
      filteredProgramOptions.value = programOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredProgramOptions.value = programOptions.value.filter(
      v => (v.DETAIL_PRORAM || '').toLowerCase().indexOf(needle) > -1 ||
           (v.PROGRAM_NAME || '').toLowerCase().indexOf(needle) > -1 ||
           (v.SUB_PROGRAM || '').toLowerCase().indexOf(needle) > -1
    )
  })
}

// Fetch main transactions
const fetchTransactions = async (page = 1, limit = 10) => {
  loading.value = true
  try {
    const response = await api.get('/penyaluran', {
      params: {
        mustahikName: filters.mustahik || undefined,
        status: filters.status || undefined,
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

// File uploader method for payout
const uploadFile = async () => {
  const file = salurFile.value
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  uploadingSalur.value = true

  try {
    const res = await api.post('/penyaluran/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    payoutDialog.docSalur = res.data.url
    Notify.create({ type: 'positive', message: 'Foto penyaluran berhasil diunggah' })
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'Gagal mengunggah file' })
  } finally {
    uploadingSalur.value = false
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

// Handle workflow transitions (simple status changes)
const transitionStatus = async (id, targetStatus) => {
  Dialog.create({
    title: 'Konfirmasi Alur',
    message: `Ubah status transaksi menjadi ${targetStatus}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.post(`/penyaluran/${id}/status`, { status: targetStatus })
      Notify.create({ type: 'positive', message: `Status berhasil diubah ke ${targetStatus}` })
      
      const response = await api.get(`/penyaluran/${id}`)
      detailsDialog.data = response.data
      fetchTransactions(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah status alur'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

// Verifikasi: approve with NILAI_ACC input
const handleApprove = () => {
  Dialog.create({
    title: 'Persetujuan Pengajuan',
    message: 'Masukkan Nilai yang Disetujui (NILAI_ACC) *:',
    prompt: {
      model: String(detailsDialog.data.NILAI_PENGAJUAN || 0),
      type: 'number'
    },
    cancel: true,
    persistent: true
  }).onOk(async (val) => {
    const amt = parseFloat(val)
    if (isNaN(amt) || amt <= 0) {
      Notify.create({ type: 'negative', message: 'Nilai ACC harus valid dan lebih dari 0' })
      return
    }

    try {
      await api.post(`/penyaluran/${detailsDialog.data.IDTRANS}/status`, {
        status: 'DITERIMA',
        nilai_acc: amt
      })
      Notify.create({ type: 'positive', message: 'Pengajuan telah disetujui (DITERIMA)' })
      
      // Refresh
      const response = await api.get(`/penyaluran/${detailsDialog.data.IDTRANS}`)
      detailsDialog.data = response.data
      fetchTransactions(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menyetujui pengajuan'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

// Verifikasi: reject
const handleReject = () => {
  Dialog.create({
    title: 'Tolak Pengajuan',
    message: 'Apakah Anda yakin ingin menolak pengajuan ini?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.post(`/penyaluran/${detailsDialog.data.IDTRANS}/status`, {
        status: 'DITOLAK'
      })
      Notify.create({ type: 'positive', message: 'Pengajuan telah ditolak (DITOLAK)' })
      
      const response = await api.get(`/penyaluran/${detailsDialog.data.IDTRANS}`)
      detailsDialog.data = response.data
      fetchTransactions(pagination.value.page, pagination.value.rowsPerPage)
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menolak pengajuan'
      Notify.create({ type: 'negative', message: msg })
    }
  })
}

// Payout (Pencairan) helper functions
const openPayoutDialog = async (trx) => {
  loading.value = true
  try {
    await fetchCaraBayarOptions()
    await fetchJenisDanaOptions()

    payoutDialog.idtrans = trx.IDTRANS
    payoutDialog.nilaiAcc = parseFloat(trx.NILAI_ACC || 0)
    payoutDialog.tipePenyaluran = 'PENDISTRIBUSIAN'
    payoutDialog.idbayar = ''
    payoutDialog.tipeBayar = ''
    payoutDialog.caraBayar = ''
    payoutDialog.docSalur = ''
    
    // Start with 1 empty row of detail
    payoutDialog.details = [
      {
        jenisDanaObj: null,
        programObj: null,
        JENIS_DANA: null,
        JENISDANA: '',
        IDPROG: '',
        PROGRAM: '',
        SUB_PROGRAM: '',
        SDGS_GOALS: '',
        SUB_TOTAL: 0,
        DETAIL_PROGRAM: ''
      }
    ]

    salurFile.value = null
    detailsDialog.open = false // Close details dialog
    payoutDialog.open = true
  } catch (error) {
    console.error('Failed to open payout dialog:', error)
    Notify.create({ type: 'negative', message: 'Gagal memuat rincian pencairan' })
  } finally {
    loading.value = false
  }
}

const onPayoutIdbayarChange = (val) => {
  const found = caraBayarOptions.value.find(cb => cb.bayar_id === val)
  if (found) {
    payoutDialog.tipeBayar = found.tipe_bayar
    payoutDialog.caraBayar = found.cara_bayar
  }
}

const onPayoutJenisDanaChange = (index) => {
  const row = payoutDialog.details[index]
  if (row.jenisDanaObj) {
    row.JENIS_DANA = row.jenisDanaObj.id
    row.JENISDANA = `${row.jenisDanaObj.dana} - ${row.jenisDanaObj.sub_dana}`
  }
}

const onPayoutProgramChange = (index) => {
  const row = payoutDialog.details[index]
  if (row.programObj) {
    row.IDPROG = row.programObj.IDPROGRAM
    row.PROGRAM = row.programObj.PROGRAM_NAME
    row.SUB_PROGRAM = row.programObj.SUB_PROGRAM || ''
    row.DETAIL_PROGRAM = row.programObj.DETAIL_PRORAM || ''
    row.SDGS_GOALS = row.programObj.SDGS || ''
  }
}

const addPayoutDetailRow = () => {
  payoutDialog.details.push({
    jenisDanaObj: null,
    programObj: null,
    JENIS_DANA: null,
    JENISDANA: '',
    IDPROG: '',
    PROGRAM: '',
    SUB_PROGRAM: '',
    SDGS_GOALS: '',
    SUB_TOTAL: 0,
    DETAIL_PROGRAM: ''
  })
}

const removePayoutDetailRow = (index) => {
  payoutDialog.details.splice(index, 1)
}

const submitPayout = async () => {
  if (totalRealisasi.value > payoutDialog.nilaiAcc) {
    Notify.create({ type: 'negative', message: 'Nilai realisasi pencairan melebihi Nilai ACC!' })
    return
  }

  const formattedDetails = payoutDialog.details.map(row => ({
    JENIS_DANA: row.JENIS_DANA,
    JENISDANA: row.JENISDANA,
    IDPROG: row.IDPROG,
    PROGRAM: row.PROGRAM,
    SUB_PROGRAM: row.SUB_PROGRAM,
    SUB_TOTAL: row.SUB_TOTAL,
    DETAIL_PROGRAM: row.DETAIL_PROGRAM,
    SDGS_GOALS: row.SDGS_GOALS
  }))

  const payload = {
    status: 'FINISH',
    tipe_penyaluran: payoutDialog.tipePenyaluran,
    idbayar: payoutDialog.idbayar,
    tipe_bayar: payoutDialog.tipeBayar,
    cara_bayar: payoutDialog.caraBayar,
    nilai: totalRealisasi.value,
    doc_salur: payoutDialog.docSalur,
    details: formattedDetails
  }

  try {
    await api.post(`/penyaluran/${payoutDialog.idtrans}/status`, payload)
    Notify.create({ type: 'positive', message: 'Pencairan berhasil diselesaikan' })
    payoutDialog.open = false

    // Fetch fresh database row including relations to print receipt
    const response = await api.get(`/penyaluran/${payoutDialog.idtrans}`)
    printReceipt(response.data)

    fetchTransactions(pagination.value.page, pagination.value.rowsPerPage)
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menyelesaikan pencairan'
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
  await fetchPrograms()
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
