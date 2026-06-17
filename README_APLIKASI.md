# Dokumentasi & Panduan Aplikasi: Manajemen Penyaluran BMH

Aplikasi **Manajemen Penyaluran** ini dirancang secara khusus untuk memenuhi seluruh instruksi yang Anda berikan di [instruksi.md](file:///D:/BelajarPrograming/quasar/myprodaya/instruksi.md). Sistem ini dibangun menggunakan **Quasar + Vue.js** di sisi frontend, dan **Node.js + Express + MySQL** di sisi backend.

---

## 🚀 Fitur Utama yang Telah Diimplementasikan

### 1. Sistem Autentikasi Modern (Multi-User & Google Login)
*   **Login Email / Username**: Autentikasi terintegrasi dengan tabel `sec_users` di database `myprodaya_dev`. Karena password di database saat ini disimpan dalam bentuk plain-text, sistem melakukan verifikasi langsung.
*   **Google Sign-In (Simulated & Real)**: Menyediakan tombol Google Login. Kami menyertakan panel khusus pengujian untuk mensimulasikan login menggunakan email-email terdaftar (`adhepur@gmail.com`, `akhar.umk@gmail.com`, dll.) sehingga Anda bisa mengujinya secara instan tanpa hambatan API Key.

### 2. Otorisasi Kantor Hierarkis (Multi-Office)
*   Sistem memetakan relasi hierarki kantor dari tabel `mycrm_dev.tbl_office` (contoh: `0` untuk Pusat, `031` untuk Jatim, `03107` untuk Gerai).
*   **Filter Hierarkis**: Pengguna dari kantor cabang hanya bisa melihat dan memodifikasi data dari kantornya sendiri dan sub-kantor di bawahnya (`LIKE '031%'`). Admin (`priv_admin = 'Y'`) atau Kantor Pusat (`office = '0'`) memiliki akses penuh ke seluruh kantor.

### 3. Alur Manajemen Penyaluran Donasi
*   **Alur Kerja**: `MASUK` -> `OPEN` -> `DITERIMA` / `DITOLAK` -> `PROSES PENCAIRAN` -> `FINISH`.
*   **Form Dinamis & Detail Rincian (`dpenyaluran`)**: Form pembuatan penyaluran donasi mendukung penambahan beberapa baris item program (`dpenyaluran`) secara dinamis. Nilai pengajuan utama (`NILAI_PENGAJUAN`) otomatis terhitung dari jumlah sub-total detail program.
*   **Tombol Alur Kerja**: Tombol transisi status ditampilkan secara cerdas berdasarkan status transaksi saat ini.

### 4. Manajemen Laporan & Kuota Qurban (`dataqurban` & `distribusiqurban`)
*   **Hanya Edit (Tanpa Add)**: Sesuai instruksi, menu qurban hanya menyediakan fitur pengeditan untuk data transaksi yang sudah masuk (`dataqurban`).
*   **Otorisasi PJ Lapangan**: Setiap titik distribusi (`distribusiqurban`) memiliki `user_pj` masing-masing. Hanya user PJ tersebut atau Admin yang diizinkan untuk mengunggah foto, mengubah status, atau mengedit data qurban di area tersebut.
*   **Alur Status Laporan**: `OPEN` -> `TERDISTRIBUSI` -> `TERPOTONG` (bisa massal) -> `VERIFIKASI` (terpicu saat foto diupload) -> `FINISH` (mengunci data secara permanen).
*   **Manajemen Kuota**: Saat menetapkan/mengubah titik distribusi, sistem secara otomatis mengecek kuota yang tersedia (`tersedia`), mengurangi kuota baru, dan mengembalikan kuota lama jika titik distribusi diubah.
*   **Bulk Status**: Anda dapat mencentang beberapa hewan qurban di tabel lalu mengubah statusnya secara massal menjadi `TERPOTONG`.

### 5. Dashboard Interaktif & Peta Sebaran (Leaflet Map)
*   **Dashboard Penyaluran**: Menampilkan total pengajuan, disetujui, dan realisasi, rincian program utama, grafik tren bulanan menggunakan SVG modern, serta peta sebaran mustahik.
*   **Dashboard Qurban**: Menampilkan jumlah hewan qurban, nominal total, donatur, status breakdown, produk terlaris, serta peta distribusi hewan qurban.
*   **Leaflet Map Interaktif**:
    *   Menggunakan penanda/marker berbasis SVG kustom yang modern.
    *   Menampilkan tooltip popup berisi data mustahik atau rincian detail hewan qurban (jenis produk, jumlah ekor, nominal, dan nama PJ Lapangan) di lokasi tersebut.
    *   **Fitur Fly-To**: Pada daftar tabel mustahik, mengeklik tombol *Lihat di Peta* akan memutar map dan terbang (zoom-in) secara dinamis ke pin mustahik tersebut.

### 6. Media Penyimpanan Tencent Edgeone / COS
*   File foto dokumentasi qurban (`foto1`, `foto2`, `foto3`) akan diunggah ke Tencent Cloud Object Storage bucket `myprodaya`.
*   **Fallback Lokal**: Jika kredensial Tencent COS di `.env` belum diisi, sistem secara otomatis menyimpannya ke folder lokal `public/uploads/` dan menyajikan URL lokal. Aplikasi dijamin tetap berfungsi penuh saat pengujian tanpa error.

---

## 🛠️ Cara Menjalankan Aplikasi

Aplikasi backend dan frontend dapat dijalankan bersamaan dengan satu perintah mudah.

### Langkah 1: Konfigurasi Lingkungan (`.env`)
File [.env](file:///D:/BelajarPrograming/quasar/myprodaya/.env) sudah dibuat di direktori root dengan konfigurasi default MySQL localhost:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=myprodaya_dev
JWT_SECRET=bmh_myprodaya_secret_key_9988
```
*(Anda dapat melengkapi `COS_SECRET_ID`, `COS_SECRET_KEY`, dan `GOOGLE_CLIENT_ID` di file tersebut saat siap dideploy).*

### Langkah 2: Jalankan Server & Aplikasi
Buka terminal di direktori root `D:\BelajarPrograming\quasar\myprodaya` dan jalankan perintah:
```bash
npm run dev
```
Perintah ini akan menjalankan:
1. **Express API Server** di `http://localhost:3000`
2. **Quasar Frontend** di `http://localhost:9000` (atau port default Quasar) dan membuka web browser secara otomatis.

---

## 💡 Panduan Pengujian Cepat (Autofill & Mock)

1.  **Halaman Login**:
    *   Gunakan **Asisten Pengujian** di bawah form login untuk mengisi akun secara otomatis (tersedia pilihan Admin, PJ Akhyar, PJ Adhe, PJ Fahmi).
    *   Atau klik **Masuk dengan Google** dan pilih salah satu akun email simulasi untuk menguji login instan.
2.  **Manajemen Mustahik**:
    *   Coba buat mustahik baru, tentukan provinsi (misal: Jawa Barat atau Sulawesi Selatan).
    *   Lihat datanya di tabel dan klik tombol **Lihat di Peta** (icon GPS) untuk melihat map bergeser dan memperbesar posisi mustahik tersebut secara langsung.
3.  **Manajemen Laporan Qurban**:
    *   Pilih item qurban yang berstatus `OPEN` (belum terdistribusi). Edit dan tentukan titik distribusi (misal: "Masyarakat Pondok Rajeg" atau "PEMOGAN, DENPASAR BALI"). Kuota titik distribusi tersebut akan terpotong secara otomatis, dan status berubah menjadi `TERDISTRIBUSI`.
    *   Upload file gambar pada Foto 1 dan Foto 2. Status qurban tersebut akan berubah secara otomatis menjadi `VERIFIKASI`.
    *   Gunakan fitur centang checkbox di sebelah kiri baris tabel untuk menyeleksi beberapa item, lalu klik **Set Status TERPOTONG Massal** pada bilah melayang di bagian bawah.
