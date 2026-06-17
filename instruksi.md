# Informasi Aplikasi

nama : Manajeman Penyaluran
lembaga : BMH - Baitul Maal Hidayatullah
logo : logo_bmh.png

# Gambaran aplikasi

- aplikasi ini adalah untuk melakukan manajemen penyaluran donasi berbasis program2 yang sdudah ada
- memetakan calon atau mustahik sesuai dengan wilayah
- proses penyaluran [penyarulan, dpenyaluran] nya diawali dari MASUK->OPEN->DITERIMA/DITOLAK->PROSES PENCAIRAN->FINISH
- detail penyalurannya ada di [dpenyaluran]
- ada juga manajemen laporan qurban tidak ada fungsi add, hanya edit [dataqurban], OPEN(data baru)->TERDISTRIBUSI (jika sudah ditetapkan titik distribusinya)->TERPOTONG (perubahan status oleh user, bisa massal)->VERIFIKASI(jika data foto2 sdh di upload)->FINISH(jika foto sdh dianggap oke, dan jika sudah FINISH data ter lock). Setiap wilayah distribusi ada user pj nya masing2, dan hanya user pj tersebut yang bisa melakuna perubahan. User pj akan terbentuk seiring dengan di tetapkannya titik distribusi, karena setiap titik distribusi sdh ada user pj nya msing-masing.
- titik distribusi qurban ada di tabel [distribusiqurban], dan hanya yg aktif saya yg bisa digunakan. Ada quota penyaluran dan sisa, setiap tahun quto bisa ditambahkan. quota - sisa = penggunaan. Setiap kali [dataqurban] dilakukan distribusi akan mengurangi quota ini
- multi user [sec_users] dan multi office [mycrm_dev.tbl_office]
- manajemen pengaturan mustahik [mustahik]
- dilengkapi dengan dashboard penyaluran yang interaktif dengan berbagai macam filternya. ada map titik sebaran mustahik,
- dashboard qurban dibuat terpisah, dengan data-data khusus qurban (produk, titik distribusi, tahun, status ) ada juga map distribusi hewan qurbannya, dengan tooltip jenis qurban beserta jumlahnya, total nominal,
- setiap

# env, informasi environment

host : "localhost"
db : "myprodaya_dev" dan "mycrm_dev"
user : "root"
pass : ""

# storage manajemen

saya menggunakan storage manajemen dari tencents edgeone
bucket = myprodaya
key =

# role manajemen

- office hierarkis -> 0, 031, 03107, 035, 03507 dst..
- ADMIN,
- login menggunakan email

# teknologi yg digunakan

- quasar + vue.js
- db mysql
- support login dengan google
- mobile friendly,
- support PWA
- setup juga icongenie
- gunakan layout yang modern dan menarik
