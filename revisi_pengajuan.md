# perbaikan phase 2
- berikut adalah struktur korelasi antar tabel
-- penyaluran (IDTRANS[pk], TIPE_DOC, PENGAJUAN_DOC, OFFICE, STATUS, TGL_TRANS, FINISH_DATE, IDBAYAR[fk-mycrm_dev.carabayar => tipe_bayar, cara_bayar], IDMUSTAHIK[fk-mustahik => reg_date, status, tipe, umum_khusus, asnaf, alamat.provinsi, kabupaten_kota, kecamatan, desa_kelurahan], PM)
-- dpenyaluran (IDDTRANS[pk], JENIS_DANA, JENISDANA, IDPROG[fk-tbl_program => SUB_PROGRAM, DETAIL_PROGRAM, SDGS], SUB_TOTAL)
-- tbl_program (IDPROGRAM[pk], PROGRAM_NAME, SUB_PROGRAM, DETAIL_PRORAM, SDGS)
-- mustahik (IDM[pk], REG_DATE, STATUS, TIPE, UMUM_KHUSUS, ASNAF, NAMA_MUSTAHIK, ALAMAT[fk-data_provinsi], ALAMAT_DETAIL)
-- data_provinsi(id[pk], provinsi, kabupaten_kota, kecamatan, desa_kelurahan, kode_pos)
-- mycrm_dev.carabayar (bayar_id[pk], tipe_bayar, cara_bayar, office, on_off, akun)

- Untuk membuat rekapitulasi penyaluran bisa memanfaatkan korelasi antar tabel di atas.
-- CardRincian Realisasi Penyaluran
-- CardTitik Sebaran Mustahik Donasi
-- CardPengelompokan Realisasi Penyaluran

- mengapa ini saya pertegas kembali,karena adanya perbedaan nilai rekap. Tolong di perbaiki ya